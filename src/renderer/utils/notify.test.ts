import { afterEach, describe, expect, it, vi } from 'vitest';
import { feedback } from '../feedback';
import { notifyError, notifySuccess } from './notify';

const notification = { success: vi.fn(), error: vi.fn() };

afterEach(() => {
  feedback.notification = null;
  vi.clearAllMocks();
});

describe('notify', () => {
  it('describes an error by its code and message', () => {
    feedback.notification = notification as never;
    const error = Object.assign(new Error('Not allowed'), {
      code: 'AccessDenied'
    });
    notifyError('Parameter was not saved', error);
    expect(notification.error).toHaveBeenCalledWith({
      title: 'Parameter was not saved',
      description: 'AccessDenied: Not allowed'
    });
  });

  it('passes a description and duration through', () => {
    feedback.notification = notification as never;
    notifySuccess('Saved', { description: 'a', duration: 0 });
    expect(notification.success).toHaveBeenCalledWith({
      title: 'Saved',
      description: 'a',
      duration: 0
    });
  });

  it('does nothing before the app has mounted', () => {
    expect(() => notifyError('Failed', new Error('x'))).not.toThrow();
  });
});
