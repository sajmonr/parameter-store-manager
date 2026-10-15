// Sorts the errors from loading parameters into the ones that get their own
// screen. Anything else returns null and is shown as a notification.

const EXPIRED_NAMES = new Set([
  'ExpiredToken',
  'ExpiredTokenException',
  'TokenRefreshRequired',
  'InvalidGrantException',
  'UnauthorizedException'
]);

const DENIED_NAMES = new Set([
  'AccessDenied',
  'AccessDeniedException',
  'UnauthorizedOperation'
]);

// The credential chain reports an expired SSO session as a generic
// CredentialsProviderError, so its message is the only clue.
const EXPIRED_MESSAGE =
  /sso.*(expired|invalid|refresh)|token.*expired|expired.*token/i;

export const FETCH_ERROR_KINDS = {
  expired: 'expired',
  denied: 'denied'
} as const;

export type FetchErrorKind =
  (typeof FETCH_ERROR_KINDS)[keyof typeof FETCH_ERROR_KINDS];

interface ErrorLike {
  name?: string;
  code?: string;
  message?: string;
}

export const classifyFetchError = (
  error: ErrorLike | null | undefined
): FetchErrorKind | null => {
  if (!error) return null;
  const { name = '', code = '', message = '' } = error;
  if (EXPIRED_NAMES.has(name) || EXPIRED_NAMES.has(code))
    return FETCH_ERROR_KINDS.expired;
  if (DENIED_NAMES.has(name) || DENIED_NAMES.has(code))
    return FETCH_ERROR_KINDS.denied;
  if (EXPIRED_MESSAGE.test(message)) return FETCH_ERROR_KINDS.expired;
  return null;
};

export const describeError = (error: ErrorLike) =>
  [error.code, error.message].filter(Boolean).join(': ');
