import { describe, expect, it } from 'vitest';
import type { Compared } from './compare';
import { statusText } from './statusText';

describe('statusText', () => {
  it('waits for the first load', () => {
    expect(statusText('loading', true, 1, 2, null)).toBe('Loading…');
    expect(statusText('ready', false, 1, 2, null)).toBe('Loading…');
    expect(statusText('error', true, 0, 0, null)).toBe('—');
  });

  it('counts the rows, or the compared keys', () => {
    expect(statusText('ready', true, 3, 10, null)).toBe('3 of 10 parameters');
    const compared = {
      comparison: { total: 5, environments: [{}, {}] },
      keys: [{}, {}]
    } as unknown as Compared;
    expect(statusText('ready', true, 3, 10, compared)).toBe(
      '2 of 5 keys · 2 environments'
    );
  });
});
