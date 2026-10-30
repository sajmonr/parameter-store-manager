// A copy of `set` with `item` removed if it was there, or added if not.
export const toggleIn = <T>(set: ReadonlySet<T>, item: T) => {
  const next = new Set(set);
  if (!next.delete(item)) next.add(item);
  return next;
};
