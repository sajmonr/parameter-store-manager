import { useCallback, useEffect, useState } from 'react';

// Measures an element, for components such as the virtual table and tree
// that need pixel sizes. Pass the returned ref to the element.
export interface Size {
  width: number;
  height: number;
}

const useElementSize = <T extends Element = HTMLDivElement>() => {
  const [element, setElement] = useState<T | null>(null);
  const [size, setSize] = useState<Size>({ width: 0, height: 0 });
  const ref = useCallback((node: T | null) => setElement(node), []);

  useEffect(() => {
    if (!element) return undefined;
    const observer = new ResizeObserver(([entry]) => {
      if (!entry) return;
      const width = Math.floor(entry.contentRect.width);
      const height = Math.floor(entry.contentRect.height);
      setSize(prev =>
        prev.width === width && prev.height === height
          ? prev
          : { width, height }
      );
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, [element]);

  return [ref, size] as const;
};

export default useElementSize;
