import { useEffect, useRef } from 'react';

// Esc closes one thing at a time, innermost first: a popup, then edit mode,
// then the pane. Each open thing registers a handler; Esc runs only the most
// recently registered one.
const handlers = [];

// An open select or tree-select closes its own dropdown on Esc.
const isOpenDropdown = target =>
  target instanceof Element && target.getAttribute('aria-expanded') === 'true';

const onKeyDown = event => {
  if (event.key !== 'Escape' || !handlers.length) return;
  if (isOpenDropdown(event.target)) return;
  event.preventDefault();
  handlers[handlers.length - 1].current(event);
};

const useEscape = (handler, enabled = true) => {
  const ref = useRef(handler);
  useEffect(() => {
    ref.current = handler;
  });

  useEffect(() => {
    if (!enabled) return undefined;
    if (!handlers.length) window.addEventListener('keydown', onKeyDown);
    handlers.push(ref);
    return () => {
      handlers.splice(handlers.indexOf(ref), 1);
      if (!handlers.length) window.removeEventListener('keydown', onKeyDown);
    };
  }, [enabled]);
};

export default useEscape;
