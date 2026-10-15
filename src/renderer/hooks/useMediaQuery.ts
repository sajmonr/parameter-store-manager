import { useCallback, useSyncExternalStore } from 'react';

// True while the CSS media query matches; re-renders when that changes.
const useMediaQuery = (query: string) => {
  const subscribe = useCallback(
    (onChange: () => void) => {
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
