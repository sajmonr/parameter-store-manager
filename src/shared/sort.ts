// Comparators for Array.prototype.sort.

// By UTF-16 code unit, like the default sort: SSM's own name order.
export const compareStrings = (a: string, b: string) =>
  a === b ? 0 : a < b ? -1 : 1;

// In the user's locale, for labels shown in a list.
export const compareLocale = (a: string, b: string) => a.localeCompare(b);

export const byString =
  <T>(select: (item: T) => string) =>
  (a: T, b: T) =>
    compareStrings(select(a), select(b));

export const byLocale =
  <T>(select: (item: T) => string) =>
  (a: T, b: T) =>
    compareLocale(select(a), select(b));
