import { describe, expect, it } from 'vitest';
import { isValueValid, MAX_VALUE_LENGTH } from './parameterValue';

describe('isValueValid', () => {
  it('needs a value within the limit', () => {
    expect(isValueValid('')).toBe(false);
    expect(isValueValid('x'.repeat(MAX_VALUE_LENGTH))).toBe(true);
    expect(isValueValid('x'.repeat(MAX_VALUE_LENGTH + 1))).toBe(false);
  });
});
