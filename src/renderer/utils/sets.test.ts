import { describe, expect, it } from 'vitest';
import { toggleIn } from './sets';

describe('toggleIn', () => {
  it('adds a missing item and removes a present one, without changing the set', () => {
    const set = new Set(['a']);
    expect([...toggleIn(set, 'b')]).toEqual(['a', 'b']);
    expect([...toggleIn(set, 'a')]).toEqual([]);
    expect([...set]).toEqual(['a']);
  });
});
