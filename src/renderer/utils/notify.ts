// Notifications shown by any part of the app. Errors are described the same
// way everywhere: the AWS error code, then its message (see describeError).
import type { ReactNode } from 'react';
import { feedback } from '../feedback';
import { describeError } from './awsErrors';
import type { ErrorLike } from './awsErrors';

interface NotifyOptions {
  description?: ReactNode;
  // Seconds; 0 keeps it open until closed.
  duration?: number;
}

export const notifySuccess = (title: string, options: NotifyOptions = {}) =>
  feedback.notification?.success({ title, ...options });

// With `error`, the description says what went wrong, unless `options`
// gives one.
export const notifyError = (
  title: string,
  error?: unknown,
  options: NotifyOptions = {}
) =>
  feedback.notification?.error({
    title,
    description:
      error === undefined ? undefined : describeError(error as ErrorLike),
    ...options
  });
