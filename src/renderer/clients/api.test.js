import { describe, expect, it } from 'vitest';
import { unwrap } from './api';

describe('unwrap', () => {
  it('returns the result of a successful call', () => {
    expect(unwrap({ ok: true, result: { a: 1 } })).toEqual({ a: 1 });
  });

  it('throws an Error carrying the AWS error name and code', () => {
    let thrown;
    try {
      unwrap({
        ok: false,
        error: {
          name: 'ParameterAlreadyExists',
          message: 'The parameter already exists.',
          code: 'ParameterAlreadyExists'
        }
      });
    } catch (error) {
      thrown = error;
    }
    expect(thrown).toBeInstanceOf(Error);
    expect(thrown).toMatchObject({
      name: 'ParameterAlreadyExists',
      message: 'The parameter already exists.',
      code: 'ParameterAlreadyExists'
    });
  });
});
