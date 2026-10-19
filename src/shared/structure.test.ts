import { describe, expect, it } from 'vitest';
import {
  DEFAULT_STRUCTURE,
  delimiterConflict,
  segmentError,
  structureErrors
} from './structure';
import type { Structure } from './structure';

describe('segmentError', () => {
  it('accepts a plain segment', () => {
    expect(segmentError('compass', '/', ['billing'])).toBeNull();
  });

  it('rejects empty segments, whitespace, the delimiter and duplicates', () => {
    expect(segmentError('', '/')).toBe('Enter a path segment.');
    expect(segmentError('my app', '/')).toBe("Can't contain spaces.");
    expect(segmentError('a/b', '/')).toBe('Can\'t contain "/".');
    expect(segmentError('dev-eu', '-')).toBe('Can\'t contain "-".');
    expect(segmentError('compass', '/', ['compass'])).toBe(
      'Already in the list.'
    );
  });

  it('rejects segments that end with the start of the delimiter', () => {
    expect(segmentError('dev.', '..')).toBe('Can\'t end with part of "..".');
    expect(segmentError('a:', '::')).toBe('Can\'t end with part of "::".');
    expect(segmentError('.dev', '..')).toBeNull();
  });

  it('skips the delimiter check without a delimiter', () => {
    expect(segmentError('a/b', '')).toBeNull();
  });
});

describe('structureErrors', () => {
  it('accepts the default structure', () => {
    expect(structureErrors(DEFAULT_STRUCTURE, '/')).toEqual([]);
  });

  it('lists bad segments and unknown or repeated environments', () => {
    const structure: Structure = {
      ...DEFAULT_STRUCTURE,
      environments: [
        { segment: 'development', color: 'green' },
        { segment: 'development', color: 'gold' }
      ],
      services: [
        { segment: 'a b', environments: ['development'] },
        {
          segment: 'compass',
          environments: ['qa', 'development', 'development']
        }
      ]
    };
    expect(structureErrors(structure, '/')).toEqual([
      'Environment "development": Already in the list.',
      'Service "a b": Can\'t contain spaces.',
      'Service "compass": no environment "qa".',
      'Service "compass": "development" is listed twice.'
    ]);
  });
});

describe('delimiterConflict', () => {
  const structure: Structure = {
    ...DEFAULT_STRUCTURE,
    environments: [{ segment: 'dev-eu', color: 'green' }],
    services: [{ segment: 'compass.api', environments: ['dev-eu'] }]
  };

  it('finds the first segment that contains the delimiter', () => {
    expect(delimiterConflict(structure, '-')).toBe('dev-eu');
    expect(delimiterConflict(structure, '.')).toBe('compass.api');
    expect(delimiterConflict(structure, '/')).toBeNull();
  });

  it('finds segments that end with the start of the delimiter', () => {
    const dotted: Structure = {
      ...DEFAULT_STRUCTURE,
      environments: [{ segment: 'dev.', color: 'green' }]
    };
    expect(delimiterConflict(dotted, '..')).toBe('dev.');
  });
});
