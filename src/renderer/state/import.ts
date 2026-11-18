// Writes the entries of an imported file with PutParameter. The page can't
// be left while it runs (see ui.showPage), so the review it came from stays
// open to show what failed.
import { create } from 'zustand';
import type { QueryClient } from '@tanstack/react-query';
import { settleEach } from '../utils/batch';
import type { EditableParameterType } from '../../shared/parameterTypes';
import type { ImportEntry } from '../utils/importFile';
import { putParameter } from './parameters';
import { sourceGuard } from './sourceGuard';

// SSM allows 3 PutParameter calls per second per account and region, shared
// with every other writer, so a large import stays under it. A throttled
// write is retried by the SDK client (adaptive mode, see main/aws.ts).
export const IMPORT_CONCURRENCY = 2;

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

const write = (client: QueryClient, { entry, overwrite }: ImportWrite) =>
  putParameter(client, {
    name: entry.name,
    // Unsupported and skipped entries, StringLists and the ones without a
    // value, are never written.
    type: entry.type as EditableParameterType,
    value: entry.value!,
    description: entry.description,
    kmsKey: entry.keyId ?? undefined,
    overwrite
  });

// Writes every entry; a failed one doesn't stop the others. Once the profile
// or region changes, the rest fail: they would go to another account or
// region.
const run = async (
  client: QueryClient,
  writes: ImportWrite[]
): Promise<ImportResult> => {
  if (useImportStore.getState().running) {
    return { written: [], failed: new Map() };
  }
  const checkSource = sourceGuard(IMPORT_SOURCE_CHANGED);
  let done = 0;
  set({ running: true, done, total: writes.length });
  try {
    const { done: written, failed } = await settleEach(writes, {
      nameOf: item => item.entry.name,
      task: item => {
        checkSource();
        return write(client, item);
      },
      concurrency: IMPORT_CONCURRENCY,
      onSettled: () => {
        done += 1;
        set({ done });
      }
    });
    return { written, failed };
  } finally {
    set(initialImportState);
  }
};

export const importActions = { run };
