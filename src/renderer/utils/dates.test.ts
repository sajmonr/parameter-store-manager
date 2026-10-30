import { describe, expect, it } from 'vitest';
import { formatExportedAt, formatModified } from './dates';

describe('dates', () => {
  it('formats a valid export date and ignores the rest', () => {
    expect(formatExportedAt(null)).toBeNull();
    expect(formatExportedAt('not a date')).toBeNull();
    expect(formatExportedAt('2025-03-04T15:07:00Z')).toEqual(
      expect.any(String)
    );
  });

  it('formats a modified date', () => {
    expect(formatModified(new Date('2025-03-04T15:07:00Z'))).toContain('2025');
  });
});
