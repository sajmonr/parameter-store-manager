// CSV export of parameters (RFC 4180: comma-separated, CRLF line endings).

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

// Characters safe in a file name on every platform; runs of others become '-'.
const slug = (text: string) =>
  text
    .replace(/[^A-Za-z0-9._-]+/g, '-')
    .replace(/^[-.]+|-+$/g, '')
    .slice(0, 60);

const pad = (n: number) => String(n).padStart(2, '0');

// Local time, so it matches the clock the user sees: 2026-10-18_14-03-22.
const timestamp = (date: Date) =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}_` +
  `${pad(date.getHours())}-${pad(date.getMinutes())}-${pad(date.getSeconds())}`;

// Says where the export came from:
// ssm-parameters_123456789012_eu-west-1_app-db_2026-10-18_14-03-22.csv.
// `account` is the account ID, or the profile name when the ID isn't known;
// it and `path` are left out when empty.
export const exportFileName = ({
  account,
  region,
  path,
  date
}: {
  account: string;
  region: string;
  path: string;
  date: Date;
}) =>
  ['ssm-parameters', slug(account), slug(region), slug(path), timestamp(date)]
    .filter(Boolean)
    .join('_') + '.csv';
