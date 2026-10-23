import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as api from '../test/mockServices';
import { createTestState, makeParameter } from '../test/testState';
import type { ExportedParameter } from '../utils/jsonExport';
import {
  IMPORT_CONCURRENCY,
  IMPORT_SOURCE_CHANGED,
  MAX_ATTEMPTS,
  importActions,
  useImportStore
} from './import';
import type { ImportWrite } from './import';
import { parametersKey } from './parameters';
import type { ParameterList } from './parameters';
import { useSettingsStore } from './settings';
import { uiActions, useUiStore } from './ui';

vi.mock('../services', () => import('../test/mockServices'));

const awsError = (code: string, message = 'failed') =>
  Object.assign(new Error(message), { name: code, code });

const entry = (
  name: string,
  extra: Partial<ExportedParameter> = {}
): ExportedParameter => ({
  name,
  type: 'String',
  value: `value of ${name}`,
  description: '',
  keyId: null,
  ...extra
});

const writes = (names: string[], overwrite = false): ImportWrite[] =>
  names.map(name => ({ entry: entry(name), overwrite }));

const putNames = () =>
  api.parametersService.put.mock.calls.map(([request]) => request.name);

beforeEach(() => {
  vi.clearAllMocks();
  api.parametersService.put.mockResolvedValue({ version: 1 });
});

afterEach(() => {
  vi.useRealTimers();
});

describe('importActions.run', () => {
  it('writes every entry with its fields, overwriting only when told to', async () => {
    const client = createTestState({ parameters: [makeParameter('/old')] });

    const result = await importActions.run(client, [
      {
        entry: entry('/new', {
          type: 'SecureString',
          value: 's3cret',
          description: 'Login',
          keyId: 'alias/app'
        }),
        overwrite: false
      },
      { entry: entry('/old', { description: 'd' }), overwrite: true },
      {
        entry: entry('/default', { type: 'SecureString', value: 'x' }),
        overwrite: false
      }
    ]);

    expect(result.written.sort()).toEqual(['/default', '/new', '/old']);
    expect(result.failed.size).toBe(0);
    expect(api.parametersService.put.mock.calls.map(([r]) => r)).toEqual([
      {
        name: '/new',
        type: 'SecureString',
        value: 's3cret',
        description: 'Login',
        kmsKey: 'alias/app',
        overwrite: false
      },
      {
        name: '/old',
        type: 'String',
        value: 'value of /old',
        description: 'd',
        kmsKey: undefined,
        overwrite: true
      },
      // Without a key, SSM uses the default one.
      {
        name: '/default',
        type: 'SecureString',
        value: 'x',
        description: '',
        kmsKey: undefined,
        overwrite: false
      }
    ]);
    // The loaded list shows what was written.
    const { profile, ssmRegion } = useSettingsStore.getState();
    const list = client.getQueryData<ParameterList>(
      parametersKey(profile, ssmRegion)
    );
    expect(list?.byName.get('/new')).toMatchObject({
      Value: 's3cret',
      Description: 'Login'
    });
    expect(useImportStore.getState().running).toBe(false);
  });

  it(`writes at most ${IMPORT_CONCURRENCY} at a time, reporting progress`, async () => {
    const client = createTestState();
    let inFlight = 0;
    let most = 0;
    const progress: number[] = [];
    const unsubscribe = useImportStore.subscribe(state => {
      if (state.running) progress.push(state.done);
    });
    api.parametersService.put.mockImplementation(async () => {
      inFlight += 1;
      most = Math.max(most, inFlight);
      await new Promise(resolve => setTimeout(resolve, 1));
      inFlight -= 1;
      return { version: 1 };
    });

    const names = Array.from({ length: 12 }, (_, i) => `/p${i}`);
    await importActions.run(client, writes(names));
    unsubscribe();

    expect(most).toBe(IMPORT_CONCURRENCY);
    expect(progress.at(-1)).toBe(12);
    expect(useImportStore.getState()).toMatchObject({
      running: false,
      done: 0,
      total: 0
    });
  });

  it('backs off and retries a throttled write', async () => {
    vi.useFakeTimers();
    const client = createTestState();
    api.parametersService.put
      .mockRejectedValueOnce(awsError('ThrottlingException'))
      .mockRejectedValueOnce(awsError('ThrottlingException'))
      .mockResolvedValue({ version: 1 });

    const running = importActions.run(client, writes(['/a']));
    await vi.advanceTimersByTimeAsync(500);
    expect(api.parametersService.put).toHaveBeenCalledTimes(2);
    // Twice as long before the next retry.
    await vi.advanceTimersByTimeAsync(999);
    expect(api.parametersService.put).toHaveBeenCalledTimes(2);
    await vi.advanceTimersByTimeAsync(1);
    const result = await running;

    expect(api.parametersService.put).toHaveBeenCalledTimes(3);
    expect(result.written).toEqual(['/a']);
  });

  it(`gives up on a write throttled ${MAX_ATTEMPTS} times`, async () => {
    vi.useFakeTimers();
    const client = createTestState();
    api.parametersService.put.mockRejectedValue(
      awsError('ThrottlingException', 'Rate exceeded')
    );

    const running = importActions.run(client, writes(['/a']));
    await vi.runAllTimersAsync();
    const result = await running;

    expect(api.parametersService.put).toHaveBeenCalledTimes(MAX_ATTEMPTS);
    expect(result.failed.get('/a')).toBe('ThrottlingException: Rate exceeded');
  });

  it('carries on past a failed write, reporting its AWS error', async () => {
    const client = createTestState();
    api.parametersService.put.mockImplementation(async ({ name }) => {
      if (name === '/b') {
        throw awsError(
          'ParameterAlreadyExists',
          'The parameter already exists.'
        );
      }
      return { version: 1 };
    });

    const result = await importActions.run(client, writes(['/a', '/b', '/c']));

    expect(result.written.sort()).toEqual(['/a', '/c']);
    expect([...result.failed]).toEqual([
      ['/b', 'ParameterAlreadyExists: The parameter already exists.']
    ]);
  });

  it('fails the rest once the profile or region changes', async () => {
    const client = createTestState();
    const release: (() => void)[] = [];
    api.parametersService.put.mockImplementation(
      () =>
        new Promise(resolve => {
          release.push(() => resolve({ version: 1 }));
        })
    );

    const names = Array.from({ length: 8 }, (_, i) => `/p${i}`);
    const running = importActions.run(client, writes(names));
    await vi.waitFor(() => expect(release).toHaveLength(IMPORT_CONCURRENCY));
    useSettingsStore.setState({ ssmRegion: 'us-west-2' });
    release.forEach(resolve => resolve());
    const result = await running;

    // The first batch was already on its way.
    expect(putNames()).toHaveLength(IMPORT_CONCURRENCY);
    expect(result.written).toHaveLength(IMPORT_CONCURRENCY);
    expect(result.failed.size).toBe(8 - IMPORT_CONCURRENCY);
    expect(new Set(result.failed.values())).toEqual(
      new Set([IMPORT_SOURCE_CHANGED])
    );
  });

  it('keeps the page from being left while it runs', async () => {
    const client = createTestState();
    let finish!: () => void;
    api.parametersService.put.mockReturnValue(
      new Promise(resolve => {
        finish = () => resolve({ version: 1 });
      })
    );
    uiActions.showPage('importExport');

    const running = importActions.run(client, writes(['/a']));
    uiActions.showPage('parameters');
    uiActions.openSettings();
    expect(useUiStore.getState().page).toBe('importExport');

    finish();
    await running;
    uiActions.showPage('parameters');
    expect(useUiStore.getState().page).toBe('parameters');
  });
});
