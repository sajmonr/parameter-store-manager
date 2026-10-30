// Export of parameters to a file, fetched from AWS when it runs: the loaded list
// may be out of date and may miss values whose load failed. It runs outside
// any component, so it carries on whichever page is shown.
import { create } from 'zustand';
import type { ApiError } from '../clients/call';
import { feedback } from '../feedback';
import { accountService, filesService } from '../services';
import { describeError } from '../utils/awsErrors';
import { parametersToCsv } from '../utils/csv';
import { exportFileName } from '../utils/exportFileName';
import { exportRows, toExported } from '../utils/exportRows';
import type { Fetched, Listed } from '../utils/exportRows';
import { toJsonExport } from '../utils/jsonExport';
import { baseName } from '../utils/paths';
import { plural } from '../utils/plural';
import type { ExportProgress } from '../utils/progress';
import { createPathMatcher, literalPrefix } from '../utils/search';
import type { FormatId } from '../../shared/fileFormats';
import { getPathDelimiter, getSettings } from './settings';
import { sourceGuard } from './sourceGuard';
import { describeAllPages, readValueBatches } from './ssmReads';

export interface ExportOptions {
  format: FormatId;
  // '' exports every parameter; otherwise those under the path, or those a
  // glob matches (see createPathMatcher).
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

// Throws when the export was cancelled or the profile or region changed since
// it started: the rest would come from a different account or region.
type Check = () => void;

const sourceCheck = (signal: AbortSignal): Check => {
  const checkSource = sourceGuard(SOURCE_CHANGED);
  return () => {
    signal.throwIfAborted();
    checkSource();
  };
};

// AWS filters on the part of the path before any wildcard; the glob is
// applied to what comes back.
const listParameters = async (
  { path, onProgress }: ExportRequest,
  check: Check
) => {
  const matcher = createPathMatcher(path, getPathDelimiter());
  const beginsWith = literalPrefix(path) || undefined;
  const listed: Listed[] = [];
  await describeAllPages(parameters => {
    check();
    parameters.forEach(p => {
      if (p.Name && matcher.test(p.Name)) listed.push({ ...p, Name: p.Name });
    });
    onProgress({ phase: 'listing', found: listed.length });
  }, beginsWith);
  return listed;
};

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
  // After the first failure the queued batches aren't sent.
  const failed = new AbortController();
  const checkBatch = () => {
    failed.signal.throwIfAborted();
    check();
  };
  await Promise.all(
    readValueBatches(names, {
      decrypt: includeSecureValues,
      check: checkBatch
    }).map(async ({ batch, values }) => {
      try {
        const res = await values;
        check();
        res.parameters.forEach(
          ({ Name, Type, Value }) => Name && fetched.set(Name, { Type, Value })
        );
        res.invalidParameters.forEach(name => deleted.add(name));
        done += batch.length;
        onProgress({ phase: 'values', done, total: names.length });
      } catch (error) {
        failed.abort(error);
        throw error;
      }
    })
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
  const { format, includeSecureValues, signal, onProgress } = request;
  const check = sourceCheck(signal);
  const region = getSettings().ssmRegion;
  const account = accountLabel();
  const listed = await listParameters(request, check);
  const { fetched, deleted } = await loadValues(
    listed.map(p => p.Name),
    request,
    check
  );

  const rows = exportRows({
    listed,
    fetched,
    deleted,
    format,
    includeSecureValues
  });

  onProgress({ phase: 'saving' });
  const date = new Date();
  const fileName = exportFileName({
    account: await account,
    region,
    path: request.path,
    date,
    extension: format
  });
  const content =
    format === 'csv'
      ? parametersToCsv(rows)
      : toJsonExport({
          region,
          decrypted: includeSecureValues,
          date,
          parameters: rows.map(toExported)
        });
  check();
  const filePath = await filesService.save(fileName, content);
  return { filePath, count: rows.length };
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
      // A batch still in flight after a failure can report late; by then
      // the store may belong to the next export.
      onProgress: progress => {
        if (controller === current) set({ progress });
      }
    });
    // null when the save dialog was cancelled.
    if (filePath) {
      feedback.notification?.success({
        title: `Saved ${baseName(filePath)} (${plural(count, 'parameter')})`
      });
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
