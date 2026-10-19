// CSV export of parameters, fetched from AWS when it runs: the loaded list
// may be out of date and may miss values whose load failed. It runs outside
// any component, so it carries on whichever page is shown.
import { create } from 'zustand';
import pAll from 'p-all';
import type { ApiError } from '../clients/call';
import { feedback } from '../feedback';
import { accountService, filesService, parametersService } from '../services';
import type { ParameterMetadata } from '../services';
import { describeError } from '../utils/awsErrors';
import { exportFileName, parametersToCsv } from '../utils/csv';
import type { CsvParameter } from '../utils/csv';
import { plural } from '../utils/plural';
import { createPrefixMatcher, literalPrefix } from '../utils/search';
import { chunk, VALUES_BATCH_SIZE } from './parameters';
import { getPathDelimiter, getSettings } from './settings';

export type ExportProgress =
  | { phase: 'listing'; found: number }
  | { phase: 'values'; done: number; total: number }
  | { phase: 'saving' };

export interface ExportOptions {
  // '' exports every parameter; otherwise the names that start with it,
  // with the same wildcards as the search.
  path: string;
  // Without them nothing is decrypted, so kms:Decrypt isn't needed.
  includeSecureValues: boolean;
}

interface ExportRequest extends ExportOptions {
  signal: AbortSignal;
  onProgress: (progress: ExportProgress) => void;
}

interface ExportResult {
  // null when the user cancelled the save dialog.
  filePath: string | null;
  count: number;
}

export const SOURCE_CHANGED =
  'The profile or region changed during the export. Export again.';

type Listed = ParameterMetadata & { Name: string };

// Throws when the export was cancelled or the profile or region changed since
// it started: the rest would come from a different account or region.
type Check = () => void;

const sourceCheck = (signal: AbortSignal): Check => {
  const { profile, ssmRegion } = getSettings();
  return () => {
    signal.throwIfAborted();
    const now = getSettings();
    if (now.profile !== profile || now.ssmRegion !== ssmRegion) {
      throw new Error(SOURCE_CHANGED);
    }
  };
};

// AWS filters on the part of the path before any wildcard; the glob is
// applied to what comes back.
const listParameters = async (
  { path, onProgress }: ExportRequest,
  check: Check
) => {
  const matcher = createPrefixMatcher(path, getPathDelimiter());
  const beginsWith = literalPrefix(path) || undefined;
  const listed: Listed[] = [];
  let nextToken: string | undefined;
  do {
    const page = await parametersService.describe(nextToken, beginsWith);
    check();
    page.parameters.forEach(p => {
      if (p.Name && matcher.test(p.Name)) listed.push({ ...p, Name: p.Name });
    });
    onProgress({ phase: 'listing', found: listed.length });
    ({ nextToken } = page);
  } while (nextToken);
  return listed;
};

interface Fetched {
  Type?: string;
  Value?: string;
}

// The type and value of every name, and the names deleted since they were
// listed. SecureStrings are only decrypted when their values are included.
const loadValues = async (
  names: string[],
  { includeSecureValues, onProgress }: ExportRequest,
  check: Check
) => {
  const fetched = new Map<string, Fetched>();
  const deleted = new Set<string>();
  let done = 0;
  onProgress({ phase: 'values', done, total: names.length });
  await pAll(
    chunk(names, VALUES_BATCH_SIZE).map(batch => async () => {
      check();
      const res = await parametersService.getValues(batch, includeSecureValues);
      check();
      res.parameters.forEach(
        ({ Name, Type, Value }) => Name && fetched.set(Name, { Type, Value })
      );
      res.invalidParameters.forEach(name => deleted.add(name));
      done += batch.length;
      onProgress({ phase: 'values', done, total: names.length });
    }),
    { concurrency: 2, stopOnError: true }
  );
  return { fetched, deleted };
};

// The account ID, or the profile name when it can't be read.
const accountLabel = async () => {
  const id = await accountService.getId().catch(() => null);
  return id || getSettings().profile;
};

const exportParameters = async (
  request: ExportRequest
): Promise<ExportResult> => {
  const { includeSecureValues, signal, onProgress } = request;
  const check = sourceCheck(signal);
  const region = getSettings().ssmRegion;
  const account = accountLabel();
  const listed = await listParameters(request, check);
  const { fetched, deleted } = await loadValues(
    listed.map(p => p.Name),
    request,
    check
  );

  const rows = listed
    .filter(p => !deleted.has(p.Name))
    .sort((a, b) => (a.Name < b.Name ? -1 : 1))
    .map((p): CsvParameter => {
      // The type as of the value fetch: the parameter may have been
      // recreated as a SecureString since it was listed.
      const { Type = p.Type, Value } = fetched.get(p.Name) ?? {};
      const secure = Type === 'SecureString';
      return {
        Name: p.Name,
        Value: secure && !includeSecureValues ? undefined : Value,
        Type,
        Description: p.Description,
        KeyId: secure ? p.KeyId : undefined
      };
    });

  onProgress({ phase: 'saving' });
  const fileName = exportFileName({
    account: await account,
    region,
    path: request.path,
    date: new Date()
  });
  check();
  const filePath = await filesService.saveCsv(fileName, parametersToCsv(rows));
  return { filePath, count: rows.length };
};

export const describeProgress = (progress: ExportProgress) => {
  if (progress.phase === 'listing') {
    return `Listing parameters… ${progress.found.toLocaleString()} found`;
  }
  if (progress.phase === 'values') {
    return `Fetching values… ${progress.done.toLocaleString()} / ${progress.total.toLocaleString()}`;
  }
  return 'Saving…';
};

export interface ExportState {
  running: boolean;
  // null until the first progress report.
  progress: ExportProgress | null;
}

export const initialExportState: ExportState = {
  running: false,
  progress: null
};

export const useExportStore = create<ExportState>()(() => initialExportState);

const set = useExportStore.setState;

// The running export's; null while none runs.
let controller: AbortController | null = null;

// Does nothing while an export is running.
const start = async (options: ExportOptions) => {
  if (controller) return;
  const current = new AbortController();
  controller = current;
  set({ running: true, progress: null });
  try {
    const { filePath, count } = await exportParameters({
      ...options,
      signal: current.signal,
      onProgress: progress => {
        if (!current.signal.aborted) set({ progress });
      }
    });
    // null when the save dialog was cancelled.
    if (filePath) {
      feedback.message?.success(`Exported ${plural(count, 'parameter')}`);
    }
  } catch (error) {
    if (!current.signal.aborted) {
      feedback.notification?.error({
        title: 'Parameters were not exported',
        description: describeError(error as ApiError)
      });
    }
  } finally {
    // A cancelled export may finish after the next one has started.
    if (controller === current) {
      controller = null;
      set(initialExportState);
    }
  }
};

// Stops the running export, if any.
const cancel = () => {
  controller?.abort();
  controller = null;
  set(initialExportState);
};

export const exportActions = { start, cancel };
