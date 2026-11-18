// The JSON export: every field Import needs, so a file can be loaded back
// as-is. StringList isn't supported yet, so it is neither written nor read.
import {
  PARAMETER_TYPES,
  isEditableType,
  isSecureType,
  listTypes
} from '../../shared/parameterTypes';
import type { EditableParameterType } from '../../shared/parameterTypes';
import {
  fileKeyId,
  invalidEntries,
  nameProblem,
  NO_PARAMETERS,
  NOT_AN_EXPORT
} from './importFile';
import type { ImportEntry, ParseResult } from './importFile';
import { byString } from '../../shared/sort';

export const EXPORT_FORMAT = 'parameter-store-manager';
export const EXPORT_VERSION = 1;

export interface ExportedParameter {
  name: string;
  type: EditableParameterType;
  // null for a SecureString exported without decryption.
  value: string | null;
  description: string;
  // null for the default key (alias/aws/ssm) and for Strings.
  keyId: string | null;
}

export interface ExportFile {
  format: typeof EXPORT_FORMAT;
  version: typeof EXPORT_VERSION;
  exportedAt: string;
  region: string;
  decrypted: boolean;
  parameters: ExportedParameter[];
}

// UTF-8, 2-space indent, parameters sorted by name.
export const toJsonExport = ({
  region,
  decrypted,
  date,
  parameters
}: {
  region: string;
  decrypted: boolean;
  date: Date;
  parameters: ExportedParameter[];
}) => {
  const file: ExportFile = {
    format: EXPORT_FORMAT,
    version: EXPORT_VERSION,
    exportedAt: date.toISOString().replace(/\.\d{3}Z$/, 'Z'),
    region,
    decrypted,
    parameters: [...parameters].sort(byString(parameter => parameter.name))
  };
  return `${JSON.stringify(file, null, 2)}\n`;
};

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const isOptionalString = (value: unknown) =>
  value === undefined || value === null || typeof value === 'string';

// What is wrong with an entry, or null when it can be imported.
const entryProblem = (entry: unknown, seen: Set<string>): string | null => {
  if (!isObject(entry)) return 'not an object';
  const { name, type, value, description, keyId } = entry;
  const problem = nameProblem(name, seen);
  if (problem) return problem;
  if (!isEditableType(type)) {
    return `${String(name)} has type ${String(type)}, not ${listTypes(PARAMETER_TYPES)}`;
  }
  // SSM values are never empty. Only a SecureString exported without
  // decryption has none.
  const skipped = value === null && isSecureType(type);
  if (!skipped && (typeof value !== 'string' || !value)) {
    return `${String(name)} has no value`;
  }
  if (!isOptionalString(description)) {
    return `${String(name)} has an invalid description`;
  }
  if (!isOptionalString(keyId)) return `${String(name)} has an invalid keyId`;
  return null;
};

// Reads a file exported as JSON.
export const parseJsonExport = (text: string): ParseResult => {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    return { ok: false, error: NOT_AN_EXPORT };
  }
  if (
    !isObject(data) ||
    data.format !== EXPORT_FORMAT ||
    !Array.isArray(data.parameters)
  ) {
    return { ok: false, error: NOT_AN_EXPORT };
  }
  if (data.version !== EXPORT_VERSION) {
    return {
      ok: false,
      error: `This file is export version ${String(data.version)}, which this version of the app can't read.`
    };
  }

  const seen = new Set<string>();
  const problems = data.parameters.flatMap((entry, index) => {
    const problem = entryProblem(entry, seen);
    return problem ? [`entry ${index + 1}: ${problem}`] : [];
  });
  if (problems.length) return invalidEntries(problems);
  if (!data.parameters.length) return { ok: false, error: NO_PARAMETERS };

  const parameters = (data.parameters as Record<string, unknown>[]).map(
    (entry): ImportEntry => ({
      name: entry.name as string,
      type: entry.type as EditableParameterType,
      value: entry.value as string | null,
      description: (entry.description as string | null | undefined) ?? '',
      keyId: fileKeyId(entry.keyId as string | null | undefined)
    })
  );
  return {
    ok: true,
    file: {
      exportedAt: typeof data.exportedAt === 'string' ? data.exportedAt : null,
      region: typeof data.region === 'string' ? data.region : null,
      parameters
    }
  };
};
