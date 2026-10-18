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

type Listed = ParameterMetadata & { Name: string };

// AWS filters on the part of the path before any wildcard; the glob is
// applied to what comes back.
const listParameters = async ({ path, signal, onProgress }: ExportRequest) => {
  const matcher = createPrefixMatcher(path, getPathDelimiter());
  const beginsWith = literalPrefix(path) || undefined;
  const listed: Listed[] = [];
  let nextToken: string | undefined;
  do {
    const page = await parametersService.describe(nextToken, beginsWith);
    signal.throwIfAborted();
    page.parameters.forEach(p => {
      if (p.Name && matcher.test(p.Name)) listed.push({ ...p, Name: p.Name });
    });
    onProgress({ phase: 'listing', found: listed.length });
    ({ nextToken } = page);
  } while (nextToken);
  return listed;
};

// The values of `names`, and the names deleted since they were listed.
const loadValues = async (
  names: string[],
  { signal, onProgress }: ExportRequest
) => {
  const values = new Map<string, string | undefined>();
  const deleted = new Set<string>();
  let done = 0;
  onProgress({ phase: 'values', done, total: names.length });
  await pAll(
    chunk(names, VALUES_BATCH_SIZE).map(batch => async () => {
      signal.throwIfAborted();
      const res = await parametersService.getValues(batch);
      signal.throwIfAborted();
      res.parameters.forEach(p => p.Name && values.set(p.Name, p.Value));
      res.invalidParameters.forEach(name => deleted.add(name));
      done += batch.length;
      onProgress({ phase: 'values', done, total: names.length });
    }),
    { concurrency: 2, stopOnError: true }
  );
  return { values, deleted };
};

const isSecure = (p: ParameterMetadata) => p.Type === 'SecureString';

// The account ID, or the profile name when it can't be read.
const accountLabel = async () => {
  const id = await accountService.getId().catch(() => null);
  return id || getSettings().profile;
};

const exportParameters = async (
  request: ExportRequest
): Promise<ExportResult> => {
  const { includeSecureValues, signal, onProgress } = request;
  const account = accountLabel();
  const listed = await listParameters(request);
  const withValues = listed.filter(p => includeSecureValues || !isSecure(p));
  const { values, deleted } = await loadValues(
    withValues.map(p => p.Name),
    request
  );

  const rows = listed
    .filter(p => !deleted.has(p.Name))
    .sort((a, b) => (a.Name < b.Name ? -1 : 1))
    .map((p): CsvParameter => ({
      Name: p.Name,
      Value: values.get(p.Name),
      Type: p.Type,
      Description: p.Description,
      KeyId: isSecure(p) ? p.KeyId : undefined
    }));

  onProgress({ phase: 'saving' });
  const fileName = exportFileName({
    account: await account,
    region: getSettings().ssmRegion,
    path: request.path,
    date: new Date()
  });
  signal.throwIfAborted();
  const filePath = await filesService.saveCsv(fileName, parametersToCsv(rows));
  return { filePath, count: rows.length };
};

export const useExportParameters = () =>
  useMutation({ mutationFn: exportParameters });
