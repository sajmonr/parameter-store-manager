import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as api from '../clients/api';
import { feedback } from '../feedback';
import { actions, selectors } from './parameters';
import { createTestStore, makeParameter } from '../test/testStore';

vi.mock('../clients/api', () => ({
  describeParameters: vi.fn(),
  getParameters: vi.fn()
}));

const awsError = (name, message = 'failed') =>
  Object.assign(new Error(message), { name });

beforeEach(() => {
  vi.resetAllMocks();
  feedback.notification = { error: vi.fn() };
  api.getParameters.mockResolvedValue({
    parameters: [],
    invalidParameters: []
  });
});

describe('fetchAllParameters', () => {
  it('starts in the loading state and ends empty for an empty account', async () => {
    const store = createTestStore();
    expect(selectors.getLoadState(store.getState())).toBe('loading');

    api.describeParameters.mockResolvedValue({ parameters: [] });
    await store.dispatch(actions.fetchAllParameters());
    expect(selectors.getLoadState(store.getState())).toBe('empty');
  });

  it('keeps loaded parameters during a refresh and drops removed ones after', async () => {
    const store = createTestStore({
      parameters: [makeParameter('/a'), makeParameter('/b')]
    });
    let finish;
    api.describeParameters.mockReturnValue(
      new Promise(resolve => {
        finish = resolve;
      })
    );

    const done = store.dispatch(actions.fetchAllParameters());
    expect(selectors.getNames(store.getState())).toEqual(['/a', '/b']);
    expect(selectors.getLoadState(store.getState())).toBe('ready');

    finish({ parameters: [makeParameter('/b')] });
    await done;
    expect(selectors.getNames(store.getState())).toEqual(['/b']);
  });

  it('drops loaded parameters first on a reset', async () => {
    const store = createTestStore({ parameters: [makeParameter('/a')] });
    api.describeParameters.mockReturnValue(new Promise(() => {}));
    store.dispatch(actions.fetchAllParameters({ reset: true }));
    expect(selectors.getNames(store.getState())).toEqual([]);
    expect(selectors.getLoadState(store.getState())).toBe('loading');
  });

  it('shows the expired and denied screens without a notification', async () => {
    const store = createTestStore({ parameters: [makeParameter('/a')] });

    api.describeParameters.mockRejectedValue(awsError('ExpiredTokenException'));
    await store.dispatch(actions.fetchAllParameters());
    expect(selectors.getLoadState(store.getState())).toBe('expired');

    api.describeParameters.mockRejectedValue(awsError('AccessDeniedException'));
    await store.dispatch(actions.fetchAllParameters());
    expect(selectors.getLoadState(store.getState())).toBe('denied');

    expect(feedback.notification.error).not.toHaveBeenCalled();
  });

  it('notifies about other errors and keeps the loaded data', async () => {
    const store = createTestStore({ parameters: [makeParameter('/a')] });
    api.describeParameters.mockRejectedValue(awsError('ThrottlingException'));
    await store.dispatch(actions.fetchAllParameters());

    expect(feedback.notification.error).toHaveBeenCalled();
    expect(selectors.getLoadState(store.getState())).toBe('ready');
    expect(selectors.getFetchError(store.getState())).toEqual({
      kind: null,
      message: 'failed'
    });
  });

  it('shows a generic error screen when nothing is loaded', async () => {
    const store = createTestStore();
    api.describeParameters.mockRejectedValue(awsError('ThrottlingException'));
    await store.dispatch(actions.fetchAllParameters());
    expect(selectors.getLoadState(store.getState())).toBe('error');
  });
});
