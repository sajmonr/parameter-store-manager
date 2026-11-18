// The rows an export writes, built from what it listed and fetched.
import type { ParameterMetadata } from '../services';
import { isEditableType, isSecureType } from '../../shared/parameterTypes';
import type { FormatId } from '../../shared/fileFormats';
import { byString } from '../../shared/sort';
import type { CsvParameter } from './csv';
import { fileKeyId } from './importFile';
import type { ExportedParameter } from './jsonExport';

// The file a format writes. JSON leaves out StringLists, which Import can't
// create yet.
export const exportsType = (format: FormatId, type: string | undefined) =>
  format === 'csv' || isEditableType(type);

export type Listed = ParameterMetadata & { Name: string };

// What GetParameters returned for a name.
export interface Fetched {
  Type?: string;
  Value?: string;
}

// The listed parameters still there when their values were fetched, sorted
// by name. SecureString values are left out unless `includeSecureValues`.
export const exportRows = ({
  listed,
  fetched,
  deleted,
  format,
  includeSecureValues
}: {
  listed: Listed[];
  fetched: ReadonlyMap<string, Fetched>;
  deleted: ReadonlySet<string>;
  format: FormatId;
  includeSecureValues: boolean;
}) =>
  listed
    .filter(p => !deleted.has(p.Name))
    .sort(byString(parameter => parameter.Name))
    .map((p): CsvParameter => {
      // The type as of the value fetch: the parameter may have been
      // recreated as a SecureString since it was listed.
      const { Type = p.Type, Value } = fetched.get(p.Name) ?? {};
      const secure = isSecureType(Type);
      return {
        Name: p.Name,
        Value: secure && !includeSecureValues ? undefined : Value,
        Type,
        Description: p.Description,
        KeyId: secure ? p.KeyId : undefined
      };
    })
    .filter(row => exportsType(format, row.Type));

// A row as the JSON file holds it; only Strings and SecureStrings get here.
export const toExported = (row: CsvParameter): ExportedParameter => ({
  name: row.Name,
  type: row.Type as ExportedParameter['type'],
  value: row.Value ?? null,
  description: row.Description ?? '',
  keyId: fileKeyId(row.KeyId)
});
