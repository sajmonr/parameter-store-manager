// CSV export of parameters, fetched from AWS when it runs: the loaded list
// may be out of date and may miss values whose load failed.
import { useMutation } from '@tanstack/react-query';
import pAll from 'p-all';
import { accountService, filesService, parametersService } from '../services';
import type { ParameterMetadata } from '../services';
import { exportFileName, parametersToCsv } from '../utils/csv';
import type { CsvParameter } from '../utils/csv';
import { createPrefixMatcher, literalPrefix } from '../utils/search';
import { chunk, VALUES_BATCH_SIZE } from './parameters';
import { getPathDelimiter, getSettings } from './settings';

export type ExportProgress =
  | { phase: 'listing'; found: number }
  | { phase: 'values'; done: number; total: number }
  | { phase: 'saving' };

export interface ExportRequest {
  // '' exports every parameter; otherwise the names that start with it,
  // with the same wildcards as the search.
  path: string;
  // Without them nothing is decrypted, so kms:Decrypt isn't needed.
  includeSecureValues: boolean;
  signal: AbortSignal;
  onProgress: (progress: ExportProgress) => void;
}

export interface ExportResult {
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

// Shared, so other components can tell whether an export is running.
export const EXPORT_MUTATION_KEY = ['exportParameters'];

export const useExportParameters = () =>
  useMutation({
    mutationKey: EXPORT_MUTATION_KEY,
    mutationFn: exportParameters
  });
