// Writes the entries of an imported file with PutParameter. The page can't
// be left while it runs (see ui.showPage), so the review it came from stays
// open to show what failed.
import { create } from 'zustand';
import pAll from 'p-all';
import type { QueryClient } from '@tanstack/react-query';
import type { ApiError } from '../clients/call';
import { describeError } from '../utils/awsErrors';
import type { EditableParameterType } from '../../main/endpoints/parameters/putParameter/putParameter.contract';
import type { ImportEntry } from '../utils/importFile';
import { putParameter } from './parameters';
import { getSettings } from './settings';

export const IMPORT_CONCURRENCY = 5;
// A throttled write is tried this many times in all, waiting twice as long
// before each retry.
export const MAX_ATTEMPTS = 5;
const FIRST_RETRY_DELAY_MS = 500;

export const IMPORT_SOURCE_CHANGED =
  'The profile or region changed during the import.';

export interface ImportWrite {
  entry: ImportEntry;
  // Only changed parameters are overwritten; a new one that exists by the
  // time it is written fails instead.
  overwrite: boolean;
}

export interface ImportResult {
  written: string[];
  // The AWS error message, by name.
  failed: Map<string, string>;
}

export interface ImportState {
  running: boolean;
  done: number;
  total: number;
}

export const initialImportState: ImportState = {
  running: false,
  done: 0,
  total: 0
};

export const useImportStore = create<ImportState>()(() => initialImportState);

const set = useImportStore.setState;

const wait = (ms: number) =>
  new Promise<void>(resolve => {
    setTimeout(resolve, ms);
  });

const isThrottled = (error: unknown) => {
  const { code, name } = error as ApiError;
  return code === 'ThrottlingException' || name === 'ThrottlingException';
};

const write = async (
  client: QueryClient,
  { entry, overwrite }: ImportWrite
) => {
  for (let attempt = 1; ; attempt += 1) {
    try {
      return await putParameter(client, {
        name: entry.name,
        // Unsupported and skipped entries, StringLists and the ones without
        // a value, are never written.
        type: entry.type as EditableParameterType,
        value: entry.value!,
        description: entry.description,
        kmsKey: entry.keyId ?? undefined,
        overwrite
      });
    } catch (error) {
      if (!isThrottled(error) || attempt >= MAX_ATTEMPTS) throw error;
      await wait(FIRST_RETRY_DELAY_MS * 2 ** (attempt - 1));
    }
  }
};

// Writes every entry; a failed one doesn't stop the others. Once the profile
// or region changes, the rest fail: they would go to another account or
// region.
const run = async (
  client: QueryClient,
  writes: ImportWrite[]
): Promise<ImportResult> => {
  const result: ImportResult = { written: [], failed: new Map() };
  if (useImportStore.getState().running) return result;
  const { profile, ssmRegion } = getSettings();
  let done = 0;
  set({ running: true, done, total: writes.length });
  try {
    await pAll(
      writes.map(item => async () => {
        const name = item.entry.name;
        try {
          const now = getSettings();
          if (now.profile !== profile || now.ssmRegion !== ssmRegion) {
            throw new Error(IMPORT_SOURCE_CHANGED);
          }
          await write(client, item);
          result.written.push(name);
        } catch (error) {
          result.failed.set(name, describeError(error as ApiError));
        }
        done += 1;
        set({ done });
      }),
      { concurrency: IMPORT_CONCURRENCY }
    );
  } finally {
    set(initialImportState);
  }
  return result;
};

export const importActions = { run };
