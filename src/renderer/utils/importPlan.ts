// What importing a file would do to the loaded parameters.
import { fileKeyId } from './importFile';
import type { ImportEntry } from './importFile';

// new: the name doesn't exist. changed: it exists and the value,
// description or KMS key differ. unchanged: they are all equal. skipped: a
// SecureString exported without its value. typeChange: it exists with
// another type, which the import doesn't change yet. unsupported: a
// StringList, which the import doesn't create yet.
export type ImportStatus =
  'new' | 'changed' | 'unchanged' | 'skipped' | 'typeChange' | 'unsupported';

export interface ImportRow {
  entry: ImportEntry;
  status: ImportStatus;
}

// The fields of a loaded parameter the import compares.
export interface Existing {
  Type?: string;
  Value?: string;
  Description?: string;
  KeyId?: string;
}

const statusOf = (
  entry: ImportEntry,
  existing: Existing | undefined
): ImportStatus => {
  if (entry.type === 'StringList') return 'unsupported';
  if (entry.value === null) return 'skipped';
  if (!existing) return 'new';
  if (existing.Type !== entry.type) return 'typeChange';
  const same =
    existing.Value === entry.value &&
    (existing.Description ?? '') === entry.description &&
    (entry.type !== 'SecureString' ||
      fileKeyId(existing.KeyId) === entry.keyId);
  return same ? 'unchanged' : 'changed';
};

export const planImport = (
  entries: ImportEntry[],
  byName: ReadonlyMap<string, Existing>
): ImportRow[] =>
  entries.map(entry => ({
    entry,
    status: statusOf(entry, byName.get(entry.name))
  }));

// New parameters are always written; changed ones only with Overwrite.
export const isWritten = (status: ImportStatus, overwrite: boolean) =>
  status === 'new' || (status === 'changed' && overwrite);

export const countStatuses = (rows: ImportRow[]) => {
  const counts: Record<ImportStatus, number> = {
    new: 0,
    changed: 0,
    unchanged: 0,
    skipped: 0,
    typeChange: 0,
    unsupported: 0
  };
  rows.forEach(row => {
    counts[row.status] += 1;
  });
  return counts;
};
