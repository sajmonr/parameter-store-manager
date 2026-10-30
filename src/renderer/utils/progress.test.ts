import { describe, expect, it } from 'vitest';
import {
  countOf,
  describeExportProgress,
  describeLoadProgress
} from './progress';

describe('countOf', () => {
  it('formats both numbers', () => {
    expect(countOf(1200, 3400)).toBe('1,200 of 3,400');
  });
});

describe('describeLoadProgress', () => {
  it('counts names while listing, then values as a percentage', () => {
    expect(
      describeLoadProgress({ found: 12, listed: false, valuesDone: 0 })
    ).toBe('Loading parameters… 12 found');
    expect(
      describeLoadProgress({ found: 200, listed: true, valuesDone: 50 })
    ).toBe('Loading values… 25% (50 of 200)');
  });
});

describe('describeExportProgress', () => {
  it('names each phase', () => {
    expect(describeExportProgress({ phase: 'listing', found: 3 })).toBe(
      'Listing parameters… 3 found'
    );
    expect(describeExportProgress({ phase: 'values', done: 1, total: 4 })).toBe(
      'Fetching values… 1 / 4'
    );
    expect(describeExportProgress({ phase: 'saving' })).toBe('Saving…');
  });
});
