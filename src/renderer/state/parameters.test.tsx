// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { QueryClient } from '@tanstack/react-query';
import * as mockApi from '../test/mockApi';
import { feedback } from '../feedback';
import { createWrapper } from '../test/render';
import { createTestState, makeParameter } from '../test/testState';
import {
  useDeleteParameter,
  useParameters,
  usePutParameter
} from './parameters';
import { useSettingsStore } from './settings';
import { uiActions } from './ui';
import { useSelectedParameter } from './views';

vi.mock('../clients/api', () => import('../test/mockApi'));

const api = vi.mocked(mockApi);

type Page = Awaited<ReturnType<typeof mockApi.describeParameters>>;

const awsError = (name: string, message = 'failed') =>
  Object.assign(new Error(message), { name });

const pending = () => {
  let resolve!: (page: Page) => void;
  const promise = new Promise<Page>(r => {
    resolve = r;
  });
  return { promise, resolve };
};

const renderParameters = (queryClient: QueryClient) =>
  renderHook(
    () => ({
      ...useParameters(),
      put: usePutParameter(),
      remove: useDeleteParameter(),
      selected: useSelectedParameter()
    }),
    { wrapper: createWrapper(queryClient) }
  );

type Rendered = ReturnType<typeof renderParameters>['result'];
const names = (result: Rendered) => result.current.parameters.map(p => p.Name);

const notifyError = vi.fn();

beforeEach(() => {
  vi.clearAllMocks();
  api.getParameters.mockResolvedValue({
    parameters: [],
    invalidParameters: []
  });
});

// The wrapper's FeedbackBridge sets the real notification API on render.
const watchNotifications = () => {
  feedback.notification = {
    ...feedback.notification!,
    error: notifyError
  };
};

describe('useParameters', () => {
  it('starts in the loading state and ends empty for an empty account', async () => {
    api.describeParameters.mockResolvedValue({ parameters: [] });
    const { result } = renderParameters(createTestState());
    expect(result.current.loadState).toBe('loading');

    await waitFor(() => expect(result.current.loadState).toBe('empty'));
  });

  it('loads every page and the values', async () => {
    api.describeParameters
      .mockResolvedValueOnce({
        parameters: [{ Name: '/b', Type: 'String' }],
        nextToken: 'next'
      })
      .mockResolvedValueOnce({ parameters: [{ Name: '/a', Type: 'String' }] });
    api.getParameters.mockImplementation(async batch => ({
      parameters: batch.map(name => makeParameter(name)),
      invalidParameters: []
    }));
    const { result } = renderParameters(createTestState());

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(names(result)).toEqual(['/a', '/b']);
    expect(result.current.byName['/a']?.Value).toBe('value of /a');
    expect(result.current.syncedAt).toBeInstanceOf(Date);
  });

  it('keeps loaded parameters during a refresh and drops removed ones after', async () => {
    const { result } = renderParameters(
      createTestState({
        parameters: [makeParameter('/a'), makeParameter('/b')]
      })
    );
    const page = pending();
    api.describeParameters.mockReturnValue(page.promise);

    act(() => {
      void result.current.refresh();
    });
    await waitFor(() => expect(result.current.loading).toBe(true));
    expect(names(result)).toEqual(['/a', '/b']);
    expect(result.current.loadState).toBe('ready');

    page.resolve({ parameters: [makeParameter('/b')] });
    await waitFor(() => expect(names(result)).toEqual(['/b']));
  });

  it('starts over when the profile changes', () => {
    api.describeParameters.mockReturnValue(new Promise(() => {}));
    const { result } = renderParameters(
      createTestState({ parameters: [makeParameter('/a')] })
    );

    act(() => useSettingsStore.setState({ profile: 'other' }));
    expect(names(result)).toEqual([]);
    expect(result.current.loadState).toBe('loading');
  });

  it('shows the expired and denied screens without a notification', async () => {
    const { result } = renderParameters(
      createTestState({ parameters: [makeParameter('/a')] })
    );
    watchNotifications();

    api.describeParameters.mockRejectedValue(awsError('ExpiredTokenException'));
    await act(() => result.current.refresh());
    await waitFor(() => expect(result.current.loadState).toBe('expired'));

    api.describeParameters.mockRejectedValue(awsError('AccessDeniedException'));
    await act(() => result.current.refresh());
    await waitFor(() => expect(result.current.loadState).toBe('denied'));

    expect(notifyError).not.toHaveBeenCalled();
  });

  it('notifies about other errors and keeps the loaded data', async () => {
    const { result } = renderParameters(
      createTestState({ parameters: [makeParameter('/a')] })
    );
    watchNotifications();

    api.describeParameters.mockRejectedValue(awsError('ThrottlingException'));
    await act(() => result.current.refresh());

    expect(notifyError).toHaveBeenCalled();
    await waitFor(() => expect(result.current.fetchError).not.toBe(null));
    expect(result.current.loadState).toBe('ready');
    expect(result.current.fetchError).toEqual({
      kind: null,
      message: 'failed'
    });
  });

  it('shows a generic error screen when nothing is loaded', async () => {
    api.describeParameters.mockRejectedValue(awsError('ThrottlingException'));
    const { result } = renderParameters(createTestState());
    await waitFor(() => expect(result.current.loadState).toBe('error'));
  });

  it('ignores an older load that finishes after a newer one', async () => {
    const { result } = renderParameters(
      createTestState({ parameters: [makeParameter('/a')] })
    );
    const oldPage = pending();
    api.describeParameters
      .mockReturnValueOnce(oldPage.promise)
      .mockResolvedValueOnce({ parameters: [makeParameter('/new')] });
    api.getParameters.mockImplementation(async batch => ({
      parameters: batch.map(name => makeParameter(name)),
      invalidParameters: []
    }));

    act(() => {
      void result.current.refresh();
    });
    // A second refresh cancels the first.
    await act(() => result.current.refresh());
    await waitFor(() => expect(names(result)).toEqual(['/new']));

    await act(async () =>
      oldPage.resolve({ parameters: [makeParameter('/old')] })
    );
    expect(names(result)).toEqual(['/new']);
    expect(api.getParameters).not.toHaveBeenCalledWith(['/old']);
  });

  it('keeps deletions and creations made while a refresh runs', async () => {
    const { result } = renderParameters(
      createTestState({
        parameters: [makeParameter('/a'), makeParameter('/b')]
      })
    );
    api.deleteParameter.mockResolvedValue({ name: '/a' });
    api.putParameter.mockResolvedValue({ version: 1 });
    const page = pending();
    api.describeParameters.mockReturnValue(page.promise);

    act(() => {
      void result.current.refresh();
    });
    await act(() => result.current.remove.mutateAsync('/a'));
    await act(() =>
      result.current.put.mutateAsync({
        name: '/c',
        type: 'String',
        value: 'v'
      })
    );
    // The list was read before both changes.
    page.resolve({ parameters: [makeParameter('/a'), makeParameter('/b')] });

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(names(result)).toEqual(['/b', '/c']);
  });

  it('forgets parameters deleted elsewhere, including an open one', async () => {
    const { result } = renderParameters(
      createTestState({
        parameters: [makeParameter('/a'), makeParameter('/b')]
      })
    );
    act(() => uiActions.selectParameter('/a'));
    expect(result.current.selected?.Name).toBe('/a');

    api.describeParameters.mockResolvedValue({
      parameters: [makeParameter('/b')]
    });
    await act(() => result.current.refresh());

    await waitFor(() => expect(result.current.selected).toBe(null));
    expect(result.current.byName).not.toHaveProperty('/a');
  });

  it('shows a saved parameter with its new version', async () => {
    const { result } = renderParameters(
      createTestState({ parameters: [makeParameter('/a')] })
    );
    api.putParameter.mockResolvedValue({ version: 2 });

    await act(() =>
      result.current.put.mutateAsync({
        name: '/a',
        type: 'String',
        value: 'new',
        overwrite: true
      })
    );
    await waitFor(() =>
      expect(result.current.byName['/a']).toMatchObject({
        Value: 'new',
        Version: 2
      })
    );
  });
});
