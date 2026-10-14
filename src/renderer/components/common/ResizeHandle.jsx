import React from 'react';
import PropTypes from 'prop-types';
import styles from './ResizeHandle.module.css';

const KEYBOARD_STEP = 16;

// A vertical drag handle on the right edge of its (position: relative)
// parent. Drag or use ←/→ to resize; double-click to reset.
const ResizeHandle = ({ width, min, max, onResize, onReset, label }) => {
  const onPointerDown = event => {
    if (event.button !== 0) return;
    event.preventDefault();
    const handle = event.currentTarget;
    const startX = event.clientX;
    const startWidth = width;
    handle.setPointerCapture?.(event.pointerId);
    document.body.classList.add(styles.resizing);

    const onMove = moveEvent =>
      onResize(startWidth + moveEvent.clientX - startX);
    const endEvents = ['pointerup', 'pointercancel', 'lostpointercapture'];
    const onEnd = () => {
      handle.removeEventListener('pointermove', onMove);
      endEvents.forEach(type => handle.removeEventListener(type, onEnd));
      document.body.classList.remove(styles.resizing);
    };
    handle.addEventListener('pointermove', onMove);
    endEvents.forEach(type => handle.addEventListener(type, onEnd));
  };

  const onKeyDown = event => {
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

ResizeHandle.propTypes = {
  label: PropTypes.string.isRequired,
  max: PropTypes.number.isRequired,
  min: PropTypes.number.isRequired,
  onReset: PropTypes.func.isRequired,
  onResize: PropTypes.func.isRequired,
  width: PropTypes.number.isRequired
};

export default ResizeHandle;
