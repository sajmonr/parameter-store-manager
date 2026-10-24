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

// The fields of a loaded parameter the import compares.
export interface Existing {
  Type?: string;
  Value?: string;
  Description?: string;
  KeyId?: string;
}

// The fields that differ between a changed entry and its parameter.
export type ChangedField = 'value' | 'description' | 'keyId';

export interface ImportRow {
  entry: ImportEntry;
  status: ImportStatus;
  // The loaded parameter of the same name, if there is one.
  existing?: Existing;
  // Set for changed entries only.
  changes: ChangedField[];
}

const changesOf = (entry: ImportEntry, existing: Existing): ChangedField[] => {
  const changes: ChangedField[] = [];
  if (existing.Value !== entry.value) changes.push('value');
  if ((existing.Description ?? '') !== entry.description) {
    changes.push('description');
  }
  if (
    entry.type === 'SecureString' &&
    fileKeyId(existing.KeyId) !== entry.keyId
  ) {
    changes.push('keyId');
  }
  return changes;
};

const rowOf = (entry: ImportEntry, existing?: Existing): ImportRow => {
  const row = (status: ImportStatus, changes: ChangedField[] = []) => ({
    entry,
    status,
    existing,
    changes
  });
  if (entry.type === 'StringList') return row('unsupported');
  if (entry.value === null) return row('skipped');
  if (!existing) return row('new');
  if (existing.Type !== entry.type) return row('typeChange');
  const changes = changesOf(entry, existing);
  return changes.length ? row('changed', changes) : row('unchanged');
};

export const planImport = (
  entries: ImportEntry[],
  byName: ReadonlyMap<string, Existing>
): ImportRow[] => entries.map(entry => rowOf(entry, byName.get(entry.name)));

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
