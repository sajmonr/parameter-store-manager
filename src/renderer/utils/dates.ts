// Dates as the app shows them, in the user's locale.

const MODIFIED_FORMAT: Intl.DateTimeFormatOptions = {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
  hour: 'numeric',
  minute: '2-digit'
};

// When a parameter was last changed: "Mar 4, 2025, 3:07 PM".
export const formatModified = (date: Date) =>
  date.toLocaleString(undefined, MODIFIED_FORMAT);

// null when the file doesn't say, as in a CSV.
export const formatExportedAt = (exportedAt: string | null) => {
  if (!exportedAt) return null;
  const date = new Date(exportedAt);
  return Number.isNaN(date.getTime())
    ? null
    : date.toLocaleString(undefined, {
        dateStyle: 'medium',
        timeStyle: 'short'
      });
};
