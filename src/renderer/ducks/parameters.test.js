import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as api from '../clients/api';
import { feedback } from '../feedback';
import { actions, selectors } from './parameters';
import { selectors as uiSelectors } from './ui';
import { createTestStore, makeParameter } from '../test/testStore';

vi.mock('../clients/api', () => ({
  describeParameters: vi.fn(),
  getParameters: vi.fn(),
  deleteParameter: vi.fn(),
  putParameter: vi.fn()
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

  it('ignores an older load that finishes after a newer one', async () => {
    const store = createTestStore();
    let finishOld;
    api.describeParameters
      .mockReturnValueOnce(
        new Promise(resolve => {
          finishOld = resolve;
        })
      )
      .mockResolvedValueOnce({ parameters: [makeParameter('/new')] });
    api.getParameters.mockImplementation(names =>
      Promise.resolve({
        parameters: names.map(name => makeParameter(name)),
        invalidParameters: []
      })
    );

    const oldLoad = store.dispatch(actions.fetchAllParameters());
    await store.dispatch(actions.fetchAllParameters({ reset: true }));
    finishOld({ parameters: [makeParameter('/old')] });
    await oldLoad;

    expect(selectors.getNames(store.getState())).toEqual(['/new']);
    expect(selectors.getValuesByName(store.getState())).not.toHaveProperty(
      '/old'
    );
  });

  it('keeps deletions and creations made while a refresh runs', async () => {
    const store = createTestStore({
      parameters: [makeParameter('/a'), makeParameter('/b')]
    });
    api.deleteParameter.mockResolvedValue({ name: '/a' });
    api.putParameter.mockResolvedValue({ version: 1 });
    let finish;
    api.describeParameters.mockReturnValue(
      new Promise(resolve => {
        finish = resolve;
      })
    );

    const refresh = store.dispatch(actions.fetchAllParameters());
    await store.dispatch(actions.deleteParameter('/a'));
    await store.dispatch(
      actions.createGenericParameter({ name: '/c', type: 'String', value: 'v' })
    );
    // The list was read before both changes.
    finish({ parameters: [makeParameter('/a'), makeParameter('/b')] });
    await refresh;

    expect(selectors.getNames(store.getState()).sort()).toEqual(['/b', '/c']);
    expect(
      selectors.getAllParameters(store.getState()).map(p => p.Name)
    ).toEqual(['/b', '/c']);
  });

  it('forgets parameters deleted elsewhere, including an open one', async () => {
    const store = createTestStore({
      parameters: [makeParameter('/a'), makeParameter('/b')]
    });
    store.dispatch({ type: 'UI_SELECT_PARAMETER', payload: '/a' });
    api.describeParameters.mockResolvedValue({
      parameters: [makeParameter('/b')]
    });
    await store.dispatch(actions.fetchAllParameters());

    expect(selectors.getParametersByName(store.getState())).not.toHaveProperty(
      '/a'
    );
    expect(uiSelectors.getSelectedParameter(store.getState())).toBe(null);
  });
});
