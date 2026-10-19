import { useEffect, useRef } from 'react';
import type { MutableRefObject } from 'react';
import usePageVisible from './usePageVisible';

type Handler = (event: KeyboardEvent) => void;

interface Registration {
  handler: MutableRefObject<Handler>;
  visible: MutableRefObject<boolean>;
}

// Esc closes one thing at a time, innermost first: a popup, then edit mode,
// then the pane. Each open thing registers a handler; Esc runs only the most
// recently registered one on the visible page. Handlers on a hidden page stay
// registered, so they keep their order when the page is shown again.
const registrations: Registration[] = [];

// An open select or tree-select closes its own dropdown on Esc.
const isOpenDropdown = (target: EventTarget | null) =>
  target instanceof Element && target.getAttribute('aria-expanded') === 'true';

const onKeyDown = (event: KeyboardEvent) => {
  if (event.key !== 'Escape') return;
  const registration = registrations.findLast(r => r.visible.current);
  if (!registration || isOpenDropdown(event.target)) return;
  event.preventDefault();
  registration.handler.current(event);
};

const useEscape = (handler: Handler, enabled = true) => {
  const pageVisible = usePageVisible();
  const handlerRef = useRef(handler);
  const visibleRef = useRef(pageVisible);
  useEffect(() => {
    handlerRef.current = handler;
    visibleRef.current = pageVisible;
  });

  useEffect(() => {
    if (!enabled) return undefined;
    const registration = { handler: handlerRef, visible: visibleRef };
    if (!registrations.length) window.addEventListener('keydown', onKeyDown);
    registrations.push(registration);
    return () => {
      registrations.splice(registrations.indexOf(registration), 1);
      if (!registrations.length) {
        window.removeEventListener('keydown', onKeyDown);
      }
    };
  }, [enabled]);
};

export default useEscape;
