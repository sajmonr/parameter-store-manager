import { describe, expect, it } from 'vitest';
import { checkNewParameter, MAX_VALUE_LENGTH } from './newParameter';
import type { NewParameterValues } from './newParameter';

const existing = new Set(['/app/Existing']);
const check = (values: NewParameterValues) =>
  checkNewParameter({ folder: '/app/', value: 'v', ...values }, existing, '/');

describe('checkNewParameter', () => {
  it('joins the folder and name', () => {
    expect(check({ name: 'New' })).toEqual({
      fullPath: '/app/New',
      nameError: null,
      ready: true
    });
  });

  it('accepts the characters SSM allows', () => {
    expect(check({ name: 'Db_host-1.primary' }).nameError).toBe(null);
  });

  it('rejects characters SSM does not allow', () => {
    ['a b', 'Key#', 'Password@', 'a\\b', 'naïve'].forEach(name =>
      expect(check({ name }).nameError).toBe('characters')
    );
  });

  it('accepts new folders inside the name', () => {
    const result = check({ name: 'Cache/Redis/Ttl' });
    expect(result).toEqual({
      fullPath: '/app/Cache/Redis/Ttl',
      nameError: null,
      ready: true
    });
  });

  it('rejects empty folders from leading, trailing or doubled delimiters', () => {
    ['/Ttl', 'Cache/', 'Cache//Ttl'].forEach(name =>
      expect(check({ name }).nameError).toBe('emptySegment')
    );
  });

  it('uses the configured delimiter for folders', () => {
    const dotted = (values: NewParameterValues) =>
      checkNewParameter(
        { folder: 'app.', value: 'v', ...values },
        existing,
        '.'
      );
    expect(dotted({ name: 'cache.Ttl' }).fullPath).toBe('app.cache.Ttl');
    expect(dotted({ name: 'cache.Ttl' }).nameError).toBe(null);
    expect(dotted({ name: 'cache..Ttl' }).nameError).toBe('emptySegment');
    expect(dotted({ name: 'a/b' }).nameError).toBe('characters');
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
