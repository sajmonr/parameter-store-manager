import { describe, expect, it } from 'vitest';
import { mergeKeys, toggleIn } from './sets';

describe('toggleIn', () => {
  it('adds a missing item and removes a present one, without changing the set', () => {
    const set = new Set(['a']);
    expect([...toggleIn(set, 'b')]).toEqual(['a', 'b']);
    expect([...toggleIn(set, 'a')]).toEqual([]);
    expect([...set]).toEqual(['a']);
  });
});

describe('mergeKeys', () => {
  it('adds new keys at the end, each once', () => {
    expect(mergeKeys(['a', 'b'], ['b', 'c', 'c'])).toEqual(['a', 'b', 'c']);
  });
});
