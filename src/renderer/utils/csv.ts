// CSV export and import of parameters (RFC 4180: comma-separated, CRLF line
// endings).
import {
  fileKeyId,
  invalidEntries,
  nameProblem,
  NOT_AN_EXPORT
} from './importFile';
import type { ImportEntry, ImportType, ParseResult } from './importFile';

export interface CsvParameter {
  Name: string;
  // Left out for SecureStrings unless their values are exported.
  Value?: string;
  Type?: string;
  Description?: string;
  // Only SecureStrings have one.
  KeyId?: string;
}

export const CSV_HEADER = ['name', 'value', 'type', 'description', 'kmsKey'];

// A field with a comma, quote or line break is quoted, with quotes doubled.
const field = (value: string) =>
  /[",\r\n]/.test(value) ? `"${value.replaceAll('"', '""')}"` : value;

export const toCsv = (rows: string[][]) =>
  rows.map(row => row.map(field).join(',')).join('\r\n') + '\r\n';

// SSM values are never empty, so an empty value means it was left out.
export const parametersToCsv = (parameters: CsvParameter[]) =>
  toCsv([
    CSV_HEADER,
    ...parameters.map(p => [
      p.Name,
      p.Value ?? '',
      p.Type ?? '',
      p.Description ?? '',
      p.KeyId ?? ''
    ])
  ]);

// Reads CSV as toCsv writes it, and as spreadsheets save it: quoted fields
// may hold commas, doubled quotes and line breaks; lines end in CRLF or LF;
// a UTF-8 byte-order mark is ignored. Returns null when a quote isn't closed.
export const fromCsv = (text: string): string[][] | null => {
  const rows: string[][] = [];
  let row: string[] = [];
  let value = '';
  let quoted = false;
  const input = text.startsWith('﻿') ? text.slice(1) : text;
  for (let i = 0; i < input.length; i += 1) {
    const char = input.charAt(i);
    if (quoted) {
      if (char !== '"') value += char;
      else if (input[i + 1] === '"') {
        value += '"';
        i += 1;
      } else quoted = false;
    } else if (char === '"') {
      quoted = true;
    } else if (char === ',') {
      row.push(value);
      value = '';
    } else if (char === '\n' || char === '\r') {
      if (char === '\r' && input[i + 1] === '\n') i += 1;
      row.push(value);
      rows.push(row);
      row = [];
      value = '';
    } else {
      value += char;
    }
  }
  if (quoted) return null;
  // A last line without a line break.
  if (value || row.length) rows.push([...row, value]);
  return rows;
};

const IMPORT_TYPES: readonly string[] = [
  'String',
  'SecureString',
  'StringList'
];

// What is wrong with a row, or null when it can be imported.
const rowProblem = (fields: string[], seen: Set<string>) => {
  if (fields.length !== CSV_HEADER.length) {
    return `has ${fields.length} fields, not ${CSV_HEADER.length}`;
  }
  const [name, value, type] = fields as [string, string, string];
  const problem = nameProblem(name, seen);
  if (problem) return problem;
  if (!IMPORT_TYPES.includes(type)) {
    return `${name} has type ${type || '(none)'}, not String, SecureString or StringList`;
  }
  // SSM values are never empty, so an empty one was left out of the export,
  // which only happens to SecureStrings.
  if (!value && type !== 'SecureString') return `${name} has no value`;
  return null;
};

// Reads a file exported as CSV. It has no region or export time. StringLists
// are read, so the review can list them, but aren't imported.
export const parseCsvExport = (text: string): ParseResult => {
  const rows = fromCsv(text)?.filter(
    // Blank lines, which spreadsheets sometimes add at the end.
    fields => fields.length > 1 || fields[0]
  );
  // Spreadsheets may change the header's case.
  const header = rows?.[0]?.map(field => field.trim().toLowerCase());
  if (!rows || header?.join(',') !== CSV_HEADER.join(',').toLowerCase()) {
    return { ok: false, error: NOT_AN_EXPORT };
  }

  const seen = new Set<string>();
  // Row 1 is the header, as a spreadsheet numbers it.
  const records = rows.slice(1);
  const problems = records.flatMap((fields, index) => {
    const problem = rowProblem(fields, seen);
    return problem ? [`row ${index + 2}: ${problem}`] : [];
  });
  if (problems.length) return invalidEntries(problems);

  const parameters = records.map(
    ([name, value, type, description, kmsKey]): ImportEntry => ({
      name: name!,
      type: type as ImportType,
      value: value || null,
      description: description!,
      keyId: type === 'SecureString' ? fileKeyId(kmsKey) : null
    })
  );
  return {
    ok: true,
    file: { exportedAt: null, region: null, parameters }
  };
};
