// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import useRetainWhileClosing from './useRetainWhileClosing';

describe('useRetainWhileClosing', () => {
  it('keeps the last value until cleared', () => {
    const { result, rerender } = renderHook(
      ({ value }) => useRetainWhileClosing(value),
      { initialProps: { value: 'a' as string | null } }
    );
    rerender({ value: null });
    expect(result.current[0]).toBe('a');
    act(() => result.current[1]());
    expect(result.current[0]).toBeNull();
    rerender({ value: 'b' });
    expect(result.current[0]).toBe('b');
  });
});
