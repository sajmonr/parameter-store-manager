import { describe, expect, it } from 'vitest';
import {
  DEFAULT_IMPORT_FORMAT,
  IMPORT_ACCEPT,
  importFormatOf
} from './formats';

describe('import formats', () => {
  it('defaults to JSON and accepts every importable extension', () => {
    expect(DEFAULT_IMPORT_FORMAT).toBe('json');
    expect(IMPORT_ACCEPT).toBe('.csv,.json');
  });

  it('reads the format a file name names', () => {
    expect(importFormatOf('export.JSON')?.id).toBe('json');
    expect(importFormatOf('export.txt')).toBeUndefined();
  });
});
