// The suggested name of an export file.

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
  date,
  extension
}: {
  account: string;
  region: string;
  path: string;
  date: Date;
  extension: string;
}) =>
  ['ssm-parameters', slug(account), slug(region), slug(path), timestamp(date)]
    .filter(Boolean)
    .join('_') + `.${extension}`;
