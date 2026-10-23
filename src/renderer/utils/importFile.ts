// A file read for import, whatever its format, and the checks every format
// shares. Any invalid entry fails the whole file, so a file is either
// imported as written or not at all.
import { DEFAULT_KMS_KEY } from '../../main/endpoints/parameters/putParameter/putParameter.contract';
import type { EditableParameterType } from '../../main/endpoints/parameters/putParameter/putParameter.contract';

// StringList entries are listed in the review but not imported yet.
export type ImportType = EditableParameterType | 'StringList';

export interface ImportEntry {
  name: string;
  type: ImportType;
  // null for a SecureString exported without decryption.
  value: string | null;
  description: string;
  // null for the default key (alias/aws/ssm) and for Strings.
  keyId: string | null;
}

export interface ImportFile {
  // null when the format doesn't record them.
  exportedAt: string | null;
  region: string | null;
  parameters: ImportEntry[];
}

export type ParseResult =
  { ok: true; file: ImportFile } | { ok: false; error: string };

export const NOT_AN_EXPORT =
  "This file isn't a Parameter Store Manager export.";

// The key as a file stores it: null when SSM would pick the same one.
export const fileKeyId = (keyId: string | null | undefined) =>
  !keyId || keyId === DEFAULT_KMS_KEY ? null : keyId;

// How many invalid entries the error spells out.
const MAX_REPORTED = 3;

// What is wrong with a name, or null when it can be imported. Records it in
// `seen`, so a name listed twice is caught. Like SSM, a name without a path
// (`Flag`) may leave out the leading slash; one with a path (`/app/Flag`)
// may not.
export const nameProblem = (name: unknown, seen: Set<string>) => {
  if (typeof name !== 'string' || !name) return 'no name';
  if (name.includes('/') && !name.startsWith('/')) {
    return `${name} doesn't start with /`;
  }
  if (/\s/.test(name)) return `${name} contains whitespace`;
  if (seen.has(name)) return `${name} is listed twice`;
  seen.add(name);
  return null;
};

// The error for a file with invalid entries, each described as
// "entry 3: …" or "row 3: …".
export const invalidEntries = (problems: string[]): ParseResult => {
  const count = problems.length;
  const rest = count - MAX_REPORTED;
  const counted =
    count === 1 ? '1 entry is' : `${count.toLocaleString()} entries are`;
  const shown = problems.slice(0, MAX_REPORTED).join('; ');
  return {
    ok: false,
    error: `${counted} invalid: ${shown}${rest > 0 ? ` and ${rest.toLocaleString()} more` : ''}.`
  };
};
