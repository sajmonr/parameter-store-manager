// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import useHorizontalScroll from './useHorizontalScroll';

// jsdom has no layout, so the sizes are set by hand.
const sized = (
  element: HTMLElement,
  scrollWidth: number,
  clientWidth = 100
) => {
  Object.defineProperty(element, 'scrollWidth', { value: scrollWidth });
  Object.defineProperty(element, 'clientWidth', { value: clientWidth });
};

const Row = () => {
  const [ref, overflow] = useHorizontalScroll();
  return (
    <div
      ref={ref}
      data-testid="row"
      data-start={overflow.start}
      data-end={overflow.end}
    >
      <span>tabs</span>
    </div>
  );
};

const renderRow = (scrollWidth: number) => {
  const { rerender } = render(<Row />);
  const row = screen.getByTestId('row');
  sized(row, scrollWidth);
  // Measures again with the sizes.
  fireEvent.scroll(row);
  rerender(<Row />);
  return row;
};

describe('useHorizontalScroll', () => {
  it('scrolls sideways with a mouse wheel and reports the cut-off edges', () => {
    const row = renderRow(300);
    expect(row.dataset).toMatchObject({ start: 'false', end: 'true' });

    act(() => {
      fireEvent.wheel(row, { deltaY: 120 });
    });
    expect(row.scrollLeft).toBe(120);
    act(() => {
      fireEvent.scroll(row);
    });
    expect(row.dataset).toMatchObject({ start: 'true', end: 'true' });

    act(() => {
      row.scrollLeft = 200;
      fireEvent.scroll(row);
    });
    expect(row.dataset).toMatchObject({ start: 'true', end: 'false' });
  });

  it('leaves the wheel alone when the row fits', () => {
    const row = renderRow(100);
    const notCancelled = fireEvent.wheel(row, { deltaY: 120 });
    expect(notCancelled).toBe(true);
    expect(row.scrollLeft).toBe(0);
    expect(row.dataset).toMatchObject({ start: 'false', end: 'false' });
  });
});
