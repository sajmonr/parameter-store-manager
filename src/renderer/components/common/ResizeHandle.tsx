import type { KeyboardEvent, PointerEvent } from 'react';
import styles from './ResizeHandle.module.css';

const KEYBOARD_STEP = 16;
// On <body> while dragging. CSS module lookups are typed as possibly missing.
const RESIZING_CLASS = styles.resizing as string;

// A vertical drag handle on the right edge of its (position: relative)
// parent. Drag or use ←/→ to resize; double-click to reset.
interface ResizeHandleProps {
  label: string;
  width: number;
  min: number;
  max: number;
  onResize: (width: number) => void;
  onReset: () => void;
}

const ResizeHandle = ({
  width,
  min,
  max,
  onResize,
  onReset,
  label
}: ResizeHandleProps) => {
  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return;
    event.preventDefault();
    const handle = event.currentTarget;
    const startX = event.clientX;
    const startWidth = width;
    handle.setPointerCapture?.(event.pointerId);
    document.body.classList.add(RESIZING_CLASS);

    const onMove = (moveEvent: globalThis.PointerEvent) =>
      onResize(startWidth + moveEvent.clientX - startX);
    const endEvents = [
      'pointerup',
      'pointercancel',
      'lostpointercapture'
    ] as const;
    const onEnd = () => {
      handle.removeEventListener('pointermove', onMove);
      endEvents.forEach(type => handle.removeEventListener(type, onEnd));
      document.body.classList.remove(RESIZING_CLASS);
    };
    handle.addEventListener('pointermove', onMove);
    endEvents.forEach(type => handle.addEventListener(type, onEnd));
  };

  const onKeyDown = (event: KeyboardEvent) => {
    if (event.key === 'ArrowLeft') onResize(width - KEYBOARD_STEP);
    else if (event.key === 'ArrowRight') onResize(width + KEYBOARD_STEP);
    else return;
    event.preventDefault();
    // Keeps the table's ↑/↓ navigation and other shortcuts out of it.
    event.stopPropagation();
  };

  return (
    <div
      role="separator"
      aria-orientation="vertical"
      aria-label={label}
      aria-valuenow={width}
      aria-valuemin={min}
      aria-valuemax={max}
      tabIndex={0}
      className={styles.handle}
      onPointerDown={onPointerDown}
      onKeyDown={onKeyDown}
      onDoubleClick={onReset}
    />
  );
};

export default ResizeHandle;
