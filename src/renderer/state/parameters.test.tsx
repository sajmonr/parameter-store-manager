// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { QueryClient } from '@tanstack/react-query';
import * as api from '../test/mockServices';
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

vi.mock('../services', () => import('../test/mockServices'));

type Page = Awaited<ReturnType<typeof api.parametersService.describe>>;

const awsError = (name: string, message = 'failed') =>
  Object.assign(new Error(message), { name });

const pending = <T = Page,>() => {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
};

type Values = Awaited<ReturnType<typeof api.parametersService.getValues>>;

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
  api.parametersService.getValues.mockResolvedValue({
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
    api.parametersService.describe.mockResolvedValue({ parameters: [] });
    const { result } = renderParameters(createTestState());
    expect(result.current.loadState).toBe('loading');

    await waitFor(() => expect(result.current.loadState).toBe('empty'));
  });

  it('loads every page and the values', async () => {
    api.parametersService.describe
      .mockResolvedValueOnce({
        parameters: [{ Name: '/b', Type: 'String' }],
        nextToken: 'next'
      })
      .mockResolvedValueOnce({ parameters: [{ Name: '/a', Type: 'String' }] });
    api.parametersService.getValues.mockImplementation(async batch => ({
      parameters: batch.map(name => makeParameter(name)),
      invalidParameters: []
    }));
    const { result } = renderParameters(createTestState());

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(names(result)).toEqual(['/a', '/b']);
    expect(result.current.byName.get('/a')?.Value).toBe('value of /a');
    expect(result.current.syncedAt).toBeInstanceOf(Date);
  });

  it('keeps loaded parameters during a refresh and drops removed ones after', async () => {
    const { result } = renderParameters(
      createTestState({
        parameters: [makeParameter('/a'), makeParameter('/b')]
      })
    );
    const page = pending();
    api.parametersService.describe.mockReturnValue(page.promise);

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
    api.parametersService.describe.mockReturnValue(new Promise(() => {}));
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

    api.parametersService.describe.mockRejectedValue(
      awsError('ExpiredTokenException')
    );
    await act(() => result.current.refresh());
    await waitFor(() => expect(result.current.loadState).toBe('expired'));

    api.parametersService.describe.mockRejectedValue(
      awsError('AccessDeniedException')
    );
    await act(() => result.current.refresh());
    await waitFor(() => expect(result.current.loadState).toBe('denied'));

    expect(notifyError).not.toHaveBeenCalled();
  });

  it('notifies about other errors and keeps the loaded data', async () => {
    const { result } = renderParameters(
      createTestState({ parameters: [makeParameter('/a')] })
    );
    watchNotifications();

    api.parametersService.describe.mockRejectedValue(
      awsError('ThrottlingException')
    );
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
    api.parametersService.describe.mockRejectedValue(
      awsError('ThrottlingException')
    );
    const { result } = renderParameters(createTestState());
    await waitFor(() => expect(result.current.loadState).toBe('error'));
  });

  it('ignores an older load that finishes after a newer one', async () => {
    const { result } = renderParameters(
      createTestState({ parameters: [makeParameter('/a')] })
    );
    const oldPage = pending();
    api.parametersService.describe
      .mockReturnValueOnce(oldPage.promise)
      .mockResolvedValueOnce({ parameters: [makeParameter('/new')] });
    api.parametersService.getValues.mockImplementation(async batch => ({
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
    expect(api.parametersService.getValues).not.toHaveBeenCalledWith(['/old']);
  });

  it('keeps deletions and creations made while a refresh runs', async () => {
    const { result } = renderParameters(
      createTestState({
        parameters: [makeParameter('/a'), makeParameter('/b')]
      })
    );
    api.parametersService.delete.mockResolvedValue({ name: '/a' });
    api.parametersService.put.mockResolvedValue({ version: 1 });
    const page = pending();
    api.parametersService.describe.mockReturnValue(page.promise);

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

    api.parametersService.describe.mockResolvedValue({
      parameters: [makeParameter('/b')]
    });
    await act(() => result.current.refresh());

    await waitFor(() => expect(result.current.selected).toBe(null));
    expect(result.current.byName.has('/a')).toBe(false);
  });

  it('shows a saved parameter with its new version', async () => {
    const { result } = renderParameters(
      createTestState({ parameters: [makeParameter('/a')] })
    );
    api.parametersService.put.mockResolvedValue({ version: 2 });

    await act(() =>
      result.current.put.mutateAsync({
        name: '/a',
        type: 'String',
        value: 'new',
        overwrite: true
      })
    );
    await waitFor(() =>
      expect(result.current.byName.get('/a')).toMatchObject({
        Value: 'new',
        Version: 2
      })
    );
  });

  it('keeps a parameter named like an Object property', async () => {
    api.parametersService.describe.mockResolvedValue({
      parameters: ['__proto__', 'constructor', 'toString'].map(name =>
        makeParameter(name)
      )
    });
    const { result } = renderParameters(createTestState());

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(names(result)).toEqual(['__proto__', 'constructor', 'toString']);
  });

  it('forgets an open parameter named like an Object property', async () => {
    const { result } = renderParameters(
      createTestState({
        parameters: [makeParameter('constructor'), makeParameter('/b')]
      })
    );
    act(() => uiActions.selectParameter('constructor'));
    expect(result.current.selected?.Name).toBe('constructor');

    api.parametersService.describe.mockResolvedValue({
      parameters: [makeParameter('/b')]
    });
    await act(() => result.current.refresh());

    await waitFor(() => expect(names(result)).toEqual(['/b']));
    expect(result.current.selected).toBe(null);
  });

  it('drops metadata that AWS no longer returns, keeping the value until the new one loads', async () => {
    const { result } = renderParameters(
      createTestState({
        parameters: [makeParameter('/a', { Description: 'old' })]
      })
    );
    const values = pending<Values>();
    api.parametersService.getValues.mockReturnValue(values.promise);
    api.parametersService.describe.mockResolvedValue({
      parameters: [{ Name: '/a', Type: 'String', Version: 2 }]
    });

    act(() => {
      void result.current.refresh();
    });
    await waitFor(() =>
      expect(result.current.byName.get('/a')?.Version).toBe(2)
    );
    expect(result.current.byName.get('/a')?.Description).toBeUndefined();
    expect(result.current.byName.get('/a')?.Value).toBe('value of /a');

    values.resolve({
      parameters: [makeParameter('/a', { Value: 'new', Version: 2 })],
      invalidParameters: []
    });
    await waitFor(() =>
      expect(result.current.byName.get('/a')?.Value).toBe('new')
    );
  });

  it('keeps the error when values of earlier pages arrive after a page fails', async () => {
    const values = pending<Values>();
    api.parametersService.getValues.mockReturnValue(values.promise);
    api.parametersService.describe
      .mockResolvedValueOnce({
        parameters: [makeParameter('/a')],
        nextToken: 'next'
      })
      .mockRejectedValueOnce(awsError('ExpiredTokenException'));
    const { result } = renderParameters(createTestState());

    await waitFor(() =>
      expect(api.parametersService.describe).toHaveBeenCalledTimes(2)
    );
    values.resolve({
      parameters: [makeParameter('/a')],
      invalidParameters: []
    });

    await waitFor(() => expect(result.current.loadState).toBe('expired'));
    await act(() => new Promise(resolve => setTimeout(resolve, 20)));
    expect(result.current.loadState).toBe('expired');
  });

  it('applies a deletion only to the profile it was made in', async () => {
    const queryClient = createTestState({
      parameters: [makeParameter('/shared')]
    });
    const { result } = renderParameters(queryClient);
    const deletion = pending<{ name: string }>();
    api.parametersService.delete.mockReturnValue(deletion.promise);
    const otherProfile = pending();
    api.parametersService.describe.mockReturnValue(otherProfile.promise);

    // Delete in the default profile, then switch before AWS answers.
    let removed!: Promise<unknown>;
    await act(async () => {
      removed = result.current.remove.mutateAsync('/shared');
    });
    await waitFor(() =>
      expect(api.parametersService.delete).toHaveBeenCalled()
    );
    act(() => useSettingsStore.setState({ profile: 'other' }));
    await waitFor(() =>
      expect(api.parametersService.describe).toHaveBeenCalledTimes(1)
    );
    await act(async () => {
      deletion.resolve({ name: '/shared' });
      await removed;
    });

    // The other profile has its own /shared.
    otherProfile.resolve({ parameters: [makeParameter('/shared')] });
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(names(result)).toEqual(['/shared']);
  });
});
