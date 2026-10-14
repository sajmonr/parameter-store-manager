import { useCallback, useSyncExternalStore } from 'react';

// True while the CSS media query matches; re-renders when that changes.
const useMediaQuery = query => {
  const subscribe = useCallback(
    onChange => {
      const media = window.matchMedia(query);
      media.addEventListener('change', onChange);
      return () => media.removeEventListener('change', onChange);
    },
    [query]
  );
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(query).matches
  );
};

export default useMediaQuery;
