import { describe, expect, it } from 'vitest';
import { chooseSource, fakeOptions } from './source';

describe('chooseSource', () => {
  it('reads fake data in development unless told to use AWS', () => {
    expect(chooseSource(false, [], {})).toBe('fake');
    expect(chooseSource(false, ['electron', '.', '--aws'], {})).toBe('aws');
    expect(chooseSource(false, [], { PSM_SOURCE: 'aws' })).toBe('aws');
  });

  it('always reads AWS when packaged', () => {
    expect(chooseSource(true, [], {})).toBe('aws');
    expect(chooseSource(true, [], { PSM_SOURCE: 'fake' })).toBe('aws');
  });
});

describe('fakeOptions', () => {
  it('has defaults that make loading visible', () => {
    expect(fakeOptions({})).toEqual({
      delayMs: 150,
      pageSize: 25,
      error: null
    });
  });

  it('reads the environment and ignores bad values', () => {
    expect(
      fakeOptions({
        PSM_FAKE_DELAY_MS: '0',
        PSM_FAKE_PAGE_SIZE: '5',
        PSM_FAKE_ERROR: 'expired'
      })
    ).toEqual({ delayMs: 0, pageSize: 5, error: 'expired' });
    expect(
      fakeOptions({
        PSM_FAKE_DELAY_MS: 'soon',
        PSM_FAKE_PAGE_SIZE: '0',
        PSM_FAKE_ERROR: 'boom'
      })
    ).toEqual({ delayMs: 150, pageSize: 25, error: null });
  });
});
