// Progress text shared by long-running work: loads, exports and imports.

// "1,200 of 3,400", in the user's number format.
export const countOf = (done: number, total: number) =>
  `${done.toLocaleString()} of ${total.toLocaleString()}`;

// How far a parameter load has got.
export interface LoadProgress {
  // The names listed so far.
  found: number;
  // Whether every page is in, so `found` is the total.
  listed: boolean;
  // The values requested so far, loaded or failed.
  valuesDone: number;
}

export const describeLoadProgress = ({
  found,
  listed,
  valuesDone
}: LoadProgress) => {
  if (!listed) {
    return `Loading parameters… ${found.toLocaleString()} found`;
  }
  const percent = found ? Math.floor((valuesDone / found) * 100) : 100;
  return `Loading values… ${percent}% (${countOf(valuesDone, found)})`;
};

export type ExportProgress =
  | { phase: 'listing'; found: number }
  | { phase: 'values'; done: number; total: number }
  | { phase: 'saving' };

export const describeExportProgress = (progress: ExportProgress) => {
  if (progress.phase === 'listing') {
    return `Listing parameters… ${progress.found.toLocaleString()} found`;
  }
  if (progress.phase === 'values') {
    return `Fetching values… ${progress.done.toLocaleString()} / ${progress.total.toLocaleString()}`;
  }
  return 'Saving…';
};
