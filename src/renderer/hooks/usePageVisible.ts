import { createContext, useContext } from 'react';

// Whether the page a component is on is the one shown. Hidden pages stay
// mounted, so window-wide keys (Esc, ↑/↓) check this before acting.
export const PageVisibleContext = createContext(true);

const usePageVisible = () => useContext(PageVisibleContext);

export default usePageVisible;
