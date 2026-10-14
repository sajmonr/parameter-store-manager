import { useCallback, useState } from 'react';

const read = key => {
  try {
    const value = Number(window.localStorage.getItem(key));
    return Number.isFinite(value) && value > 0 ? value : null;
  } catch {
    return null;
  }
};

const write = (key, value) => {
  try {
    if (value === null) window.localStorage.removeItem(key);
    else window.localStorage.setItem(key, String(value));
  } catch {
    // Storage is a convenience; the width just isn't remembered.
  }
};

// A width the user can change, remembered in localStorage under
// `storageKey`. Until the user changes it, `defaultWidth` applies, so the
// default can still follow the window size. Returns
// { width, setWidth(px), reset() }; setWidth clamps to [min, max].
const useResizableWidth = ({ storageKey, defaultWidth, min, max }) => {
  const [stored, setStored] = useState(() => read(storageKey));
  const clamp = useCallback(
    value => Math.round(Math.min(max, Math.max(min, value))),
    [min, max]
  );

  const setWidth = useCallback(
    value => {
      const next = clamp(value);
      setStored(next);
      write(storageKey, next);
    },
    [clamp, storageKey]
  );

  const reset = useCallback(() => {
    setStored(null);
    write(storageKey, null);
  }, [storageKey]);

  return {
    width: stored === null ? defaultWidth : clamp(stored),
    setWidth,
    reset
  };
};

export default useResizableWidth;
