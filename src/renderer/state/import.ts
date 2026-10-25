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

// SSM allows 3 PutParameter calls per second per account and region, shared
// with every other writer, so a large import stays under it. A throttled
// write is retried by the SDK client (adaptive mode, see main/aws.ts).
export const IMPORT_CONCURRENCY = 2;

// AWS's default PutParameter limit, which sets how long an import takes.
const WRITES_PER_SECOND = 3;
// From this many writes, the review says how long the import will take.
export const SLOW_IMPORT_WRITES = 100;

// How long writing `count` parameters takes at best: "about 35 seconds",
// "about 2 minutes".
export const importDuration = (count: number) => {
  const seconds = count / WRITES_PER_SECOND;
  if (seconds < 60) {
    const rounded = Math.max(5, Math.round(seconds / 5) * 5);
    return `about ${rounded} seconds`;
  }
  const minutes = Math.round(seconds / 60);
  return `about ${minutes} minute${minutes === 1 ? '' : 's'}`;
};

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
