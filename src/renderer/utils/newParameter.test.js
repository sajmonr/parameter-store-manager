import { describe, expect, it } from 'vitest';
import { checkNewParameter, MAX_VALUE_LENGTH } from './newParameter';

const existing = new Set(['/app/Existing']);
const check = values =>
  checkNewParameter({ folder: '/app/', value: 'v', ...values }, existing, '/');

describe('checkNewParameter', () => {
  it('joins the folder and name', () => {
    expect(check({ name: 'New' })).toEqual({
      fullPath: '/app/New',
      nameError: null,
      ready: true
    });
  });

  it('rejects whitespace, slashes and the delimiter in the name', () => {
    expect(check({ name: 'a b' }).nameError).toBe('invalid');
    expect(check({ name: 'a/b' }).nameError).toBe('invalid');
    expect(check({ name: 'a\\b' }).nameError).toBe('invalid');
    expect(
      checkNewParameter(
        { folder: 'x.', name: 'a.b', value: 'v' },
        existing,
        '.'
      ).nameError
    ).toBe('invalid');
  });

  it('rejects a name that already exists', () => {
    const result = check({ name: 'Existing' });
    expect(result.nameError).toBe('exists');
    expect(result.ready).toBe(false);
  });

  it('needs a name and a value within the limit', () => {
    expect(check({ name: '' }).ready).toBe(false);
    expect(check({ name: 'N', value: '' }).ready).toBe(false);
    expect(
      check({ name: 'N', value: 'x'.repeat(MAX_VALUE_LENGTH) }).ready
    ).toBe(true);
    expect(
      check({ name: 'N', value: 'x'.repeat(MAX_VALUE_LENGTH + 1) }).ready
    ).toBe(false);
  });
});
