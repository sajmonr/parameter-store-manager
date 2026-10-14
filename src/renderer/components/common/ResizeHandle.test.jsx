// @vitest-environment jsdom
import React from 'react';
import { beforeEach, describe, expect, it } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import useResizableWidth from '../../hooks/useResizableWidth';
import ResizeHandle from './ResizeHandle';

const Panel = () => {
  const { width, setWidth, reset } = useResizableWidth({
    storageKey: 'testWidth',
    defaultWidth: 240,
    min: 180,
    max: 600
  });
  return (
    <div data-testid="panel" style={{ width, position: 'relative' }}>
      <ResizeHandle
        label="Resize panel"
        width={width}
        min={180}
        max={600}
        onResize={setWidth}
        onReset={reset}
      />
    </div>
  );
};

const handle = () => screen.getByRole('separator', { name: 'Resize panel' });
const panelWidth = () => screen.getByTestId('panel').style.width;

beforeEach(() => window.localStorage.clear());

describe('ResizeHandle with useResizableWidth', () => {
  it('starts at the default width', () => {
    render(<Panel />);
    expect(panelWidth()).toBe('240px');
    expect(handle()).toHaveAttribute('aria-valuenow', '240');
  });

  it('resizes by dragging', () => {
    render(<Panel />);
    fireEvent.pointerDown(handle(), { button: 0, clientX: 240, pointerId: 1 });
    fireEvent.pointerMove(handle(), { clientX: 400, pointerId: 1 });
    fireEvent.pointerUp(handle(), { pointerId: 1 });
    expect(panelWidth()).toBe('400px');

    // Moving after release does nothing.
    fireEvent.pointerMove(handle(), { clientX: 500, pointerId: 1 });
    expect(panelWidth()).toBe('400px');
  });

  it('resizes with the arrow keys within the limits', () => {
    render(<Panel />);
    fireEvent.keyDown(handle(), { key: 'ArrowRight' });
    expect(panelWidth()).toBe('256px');
    for (let i = 0; i < 10; i += 1)
      fireEvent.keyDown(handle(), { key: 'ArrowLeft' });
    expect(panelWidth()).toBe('180px');
  });

  it('remembers the width and resets on double-click', () => {
    const { unmount } = render(<Panel />);
    fireEvent.keyDown(handle(), { key: 'ArrowRight' });
    unmount();

    render(<Panel />);
    expect(panelWidth()).toBe('256px');
    fireEvent.doubleClick(handle());
    expect(panelWidth()).toBe('240px');
    expect(window.localStorage.getItem('testWidth')).toBe(null);
  });
});
