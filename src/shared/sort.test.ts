import { describe, expect, it } from 'vitest';
import { byLocale, byString, compareStrings } from './sort';

describe('sort', () => {
  it('compares by code unit, like SSM', () => {
    expect(['b', 'B', 'a'].sort(compareStrings)).toEqual(['B', 'a', 'b']);
    expect(compareStrings('a', 'a')).toBe(0);
  });

  it('sorts by a selected string', () => {
    const rows = [{ name: '/b' }, { name: '/a' }];
    expect(rows.sort(byString(row => row.name))).toEqual([
      { name: '/a' },
      { name: '/b' }
    ]);
  });

  it('sorts labels in the locale', () => {
    const rows = [{ label: 'b' }, { label: 'B' }, { label: 'a' }];
    expect(rows.sort(byLocale(row => row.label)).map(row => row.label)).toEqual(
      ['a', 'b', 'B']
    );
  });
});
