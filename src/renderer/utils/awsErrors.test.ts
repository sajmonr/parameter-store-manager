import { describe, expect, it } from 'vitest';
import { classifyFetchError } from './awsErrors';

const error = (name: string, message = '') =>
  Object.assign(new Error(message), { name });

describe('classifyFetchError', () => {
  it('recognizes expired sessions', () => {
    expect(classifyFetchError(error('ExpiredTokenException'))).toBe('expired');
    expect(classifyFetchError(error('TokenRefreshRequired'))).toBe('expired');
    expect(
      classifyFetchError(
        error(
          'CredentialsProviderError',
          'The SSO session associated with this profile has expired or is otherwise invalid.'
        )
      )
    ).toBe('expired');
  });

  it('recognizes denied access', () => {
    expect(classifyFetchError(error('AccessDeniedException'))).toBe('denied');
  });

  it('leaves other errors unclassified', () => {
    expect(classifyFetchError(error('ThrottlingException'))).toBe(null);
    expect(
      classifyFetchError(
        error('CredentialsProviderError', 'Could not load credentials')
      )
    ).toBe(null);
    expect(classifyFetchError(null)).toBe(null);
  });
});
