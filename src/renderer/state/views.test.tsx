// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { DEFAULT_STRUCTURE } from '../../shared/structure';
import type { Structure } from '../../shared/structure';
import { createWrapper } from '../test/render';
import { createTestState, makeParameter } from '../test/testState';
import { useSettingsStore } from './settings';
import { useStructuredParameters } from './views';

const structure: Structure = {
  ...DEFAULT_STRUCTURE,
  enabled: true,
  services: [{ segment: 'compass', environments: ['development'] }]
};

const names = ['/development/compass/A', '/staging/compass/A', '/random/B'];

const setup = () =>
  renderHook(
    () => ({
      first: useStructuredParameters(),
      second: useStructuredParameters()
    }),
    {
      wrapper: createWrapper(
        createTestState({
          parameters: names.map(n => makeParameter(n)),
          settings: { structure }
        })
      )
    }
  );

describe('useStructuredParameters', () => {
  it('reads the loaded parameters with the structure', () => {
    const { result } = setup();
    expect([...result.current.first.matches.keys()]).toEqual([
      '/development/compass/A'
    ]);
    expect(result.current.first.other).toEqual([
      '/random/B',
      '/staging/compass/A'
    ]);
  });

  it('is computed once for every component', () => {
    const { result } = setup();
    expect(result.current.first).toBe(result.current.second);
  });

  it('keeps the result when other settings change, and not the structure', () => {
    const { result } = setup();
    const before = result.current.first;
    act(() =>
      useSettingsStore.setState({
        theme: 'dark',
        structure: { ...structure }
      })
    );
    expect(result.current.first).toBe(before);

    act(() =>
      useSettingsStore.setState({ structure: { ...structure, enabled: false } })
    );
    expect(result.current.first).not.toBe(before);
    expect(result.current.first.matches.size).toBe(0);
  });
});
