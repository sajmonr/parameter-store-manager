import { useSyncExternalStore } from 'react';

const subscribe = onChange => {
  window.addEventListener('resize', onChange);
  return () => window.removeEventListener('resize', onChange);
};

// The window's inner width; re-renders when the window is resized.
const useWindowWidth = () =>
  useSyncExternalStore(subscribe, () => window.innerWidth);

export default useWindowWidth;
