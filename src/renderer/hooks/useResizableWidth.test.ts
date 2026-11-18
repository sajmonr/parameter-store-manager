// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import useResizableWidth from './useResizableWidth';

const options = {
  storageKey: 'testWidth',
  defaultWidth: 240,
  min: 180,
  max: 600
};

beforeEach(() => window.localStorage.clear());

describe('useResizableWidth', () => {
  it('starts at the default and clamps a new width', () => {
    const { result } = renderHook(() => useResizableWidth(options));
    expect(result.current.width).toBe(240);
    act(() => result.current.setWidth(1000));
    expect(result.current.width).toBe(600);
    act(() => result.current.setWidth(10));
    expect(result.current.width).toBe(180);
  });

  it('remembers the width until it is reset', () => {
    const first = renderHook(() => useResizableWidth(options));
    act(() => first.result.current.setWidth(300.4));
    first.unmount();

    const { result } = renderHook(() => useResizableWidth(options));
    expect(result.current.width).toBe(300);
    act(() => result.current.reset());
    expect(result.current.width).toBe(240);
    expect(window.localStorage.getItem('testWidth')).toBeNull();
  });
});
