import { useCallback, useEffect, useState } from 'react';

// Which ends of a sideways-scrolling row have more content past them.
export interface Overflow {
  start: boolean;
  end: boolean;
}

const NONE: Overflow = { start: false, end: false };

// A row that scrolls sideways when it doesn't fit: a mouse wheel scrolls it
// sideways too, and it reports where content is cut off so the edges can
// show it. Pass the returned ref to the scrolling element, and a
// `contentKey` that changes when its children are replaced.
const useHorizontalScroll = <T extends HTMLElement = HTMLDivElement>(
  contentKey?: unknown
) => {
  const [element, setElement] = useState<T | null>(null);
  const [overflow, setOverflow] = useState<Overflow>(NONE);
  const ref = useCallback((node: T | null) => setElement(node), []);

  useEffect(() => {
    if (!element) return undefined;
    const measure = () => {
      const { scrollLeft, scrollWidth, clientWidth } = element;
      const next = {
        start: scrollLeft > 0,
        end: scrollLeft + clientWidth < scrollWidth - 1
      };
      setOverflow(prev =>
        prev.start === next.start && prev.end === next.end ? prev : next
      );
    };
    // Only a vertical wheel is turned sideways, and only when there's
    // somewhere to go; a trackpad's sideways swipe already works.
    const onWheel = (event: WheelEvent) => {
      if (Math.abs(event.deltaY) <= Math.abs(event.deltaX)) return;
      if (element.scrollWidth <= element.clientWidth) return;
      event.preventDefault();
      element.scrollLeft += event.deltaY;
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    // The content changes width as counts load and tabs change.
    [...element.children].forEach(child => observer.observe(child));
    element.addEventListener('scroll', measure, { passive: true });
    element.addEventListener('wheel', onWheel, { passive: false });
    return () => {
      observer.disconnect();
      element.removeEventListener('scroll', measure);
      element.removeEventListener('wheel', onWheel);
    };
  }, [element, contentKey]);

  return [ref, overflow, element] as const;
};

export default useHorizontalScroll;
