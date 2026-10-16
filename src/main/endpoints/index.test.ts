import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { IpcMainInvokeEvent } from 'electron';
import type { Contract } from '../../shared/contract';
import type * as Aws from '../aws';

const { send } = vi.hoisted(() => ({ send: vi.fn() }));

vi.mock('electron-log/main', () => ({
  default: { error: vi.fn(), warn: vi.fn() }
}));
vi.mock('../settings', () => ({
  availableSettings: { profile: 'profile' },
  getSetting: vi.fn(),
  getAllSettings: vi.fn(() => ({ profile: '' })),
  setSettings: vi.fn(values => values)
}));
vi.mock('../awsProfiles', () => ({
  listProfiles: vi.fn(async () => ({
    profiles: [{ name: 'dev', source: 'config' }],
    envProfile: null
  }))
}));
vi.mock('../updates', () => ({
  checkForRenderer: vi.fn(async () => ({ status: 'up-to-date', version: '1' })),
  openReleasePage: vi.fn(async () => {})
}));
vi.mock('../aws', async importActual => ({
  ...(await importActual<typeof Aws>()),
  ssm: () => ({ send })
}));

const updates = vi.mocked(await import('../updates'));
const settings = vi.mocked(await import('../settings'));
const { endpoints, invokeEndpoint, isTrustedSender, registerEndpoints } =
  await import('.');

const invoke = (channel: string, request?: unknown) =>
  invokeEndpoint(endpoints.get(channel)!, request);

const sentInput = () => send.mock.calls[0]![0].input;

beforeEach(() => vi.clearAllMocks());

describe('endpoints', () => {
  it('registers a handler for every contract', () => {
    const modules = import.meta.glob<Record<string, unknown>>(
      './**/*.contract.ts',
      { eager: true }
    );
    const contracts = Object.values(modules)
      .flatMap(exports => Object.values(exports))
      .filter(
        (value): value is Contract =>
          typeof value === 'object' && value !== null && 'channel' in value
      );

    expect(contracts.length).toBeGreaterThan(0);
    expect([...endpoints.keys()].sort()).toEqual(
      contracts.map(contract => contract.channel).sort()
    );
  });
});

describe('invokeEndpoint', () => {
  it('wraps results', async () => {
    send.mockResolvedValue({ Parameters: [], NextToken: 'n' });
    await expect(
      invoke('parameters.describe', { nextToken: 'token' })
    ).resolves.toEqual({
      ok: true,
      result: { parameters: [], nextToken: 'n' }
    });
    expect(sentInput()).toMatchObject({ NextToken: 'token' });
  });

  it('returns AWS errors as data, keeping the error name', async () => {
    send.mockRejectedValue(
      Object.assign(new Error('Parameter not found.'), {
        name: 'ParameterNotFound'
      })
    );

    await expect(invoke('parameters.delete', { name: '/a' })).resolves.toEqual({
      ok: false,
      error: {
        name: 'ParameterNotFound',
        message: 'Parameter not found.',
        code: 'ParameterNotFound'
      }
    });
  });

  it.each<[string, unknown]>([
    ['parameters.describe', { nextToken: 42 }],
    ['parameters.getValues', { names: [] }],
    [
      'parameters.getValues',
      { names: Array.from({ length: 11 }, (_, i) => `/p${i}`) }
    ],
    ['parameters.getValues', { names: ['/a', 1] }],
    ['parameters.put', { name: '/a', type: 'StringList', value: 'x' }],
    ['parameters.put', { name: '', type: 'String', value: 'x' }],
    ['parameters.put', { name: '/a', type: 'String', value: 1 }],
    [
      'parameters.put',
      { name: '/a', type: 'String', value: 'x', overwrite: 'yes' }
    ],
    ['parameters.delete', {}],
    ['settings.set', { unknown: 'x' }],
    ['settings.set', { theme: 'blue' }],
    // The URL to open is decided in the main process.
    ['updates.openReleasePage', 'https://evil.example']
  ])('rejects an invalid request to %s', async (channel, request) => {
    await expect(invoke(channel, request)).resolves.toMatchObject({
      ok: false,
      error: { name: 'InvalidRequest' }
    });
    expect(send).not.toHaveBeenCalled();
    expect(updates.openReleasePage).not.toHaveBeenCalled();
  });

  it('applies the schema defaults: a new parameter is tagged', async () => {
    send.mockResolvedValue({ Version: 1 });
    await invoke('parameters.put', {
      name: '/a',
      type: 'SecureString',
      value: 'v',
      kmsKey: 'alias/k'
    });
    expect(sentInput()).toMatchObject({
      Name: '/a',
      Type: 'SecureString',
      KeyId: 'alias/k',
      Overwrite: false,
      Tags: [{ Key: 'createdFrom', Value: 'ParameterStoreManager' }]
    });
  });

  it('saves only the given settings', async () => {
    await invoke('settings.set', { theme: 'dark' });
    expect(settings.setSettings).toHaveBeenCalledWith({ theme: 'dark' });
  });

  it('lists the AWS profiles', async () => {
    await expect(invoke('aws.listProfiles')).resolves.toEqual({
      ok: true,
      result: {
        profiles: [{ name: 'dev', source: 'config' }],
        envProfile: null
      }
    });
  });

  it('returns the update check result', async () => {
    await expect(invoke('updates.check')).resolves.toEqual({
      ok: true,
      result: { status: 'up-to-date', version: '1' }
    });
    expect(updates.checkForRenderer).toHaveBeenCalledTimes(1);
  });
});

describe('isTrustedSender', () => {
  it('accepts the app page only', () => {
    expect(
      isTrustedSender({ url: 'file:///app/out/renderer/index.html' })
    ).toBe(true);
    expect(isTrustedSender({ url: 'https://example.com' })).toBe(false);
    expect(isTrustedSender(null)).toBe(false);
  });

  it('accepts only the dev server while in dev mode', () => {
    const dev = 'http://localhost:5173';
    expect(isTrustedSender({ url: 'http://localhost:5173/' }, dev)).toBe(true);
    expect(isTrustedSender({ url: 'file:///x/index.html' }, dev)).toBe(false);
  });
});

describe('registerEndpoints', () => {
  it('refuses calls from untrusted frames', async () => {
    type Listener = (event: IpcMainInvokeEvent, request: unknown) => unknown;
    const registered: Record<string, Listener> = {};
    registerEndpoints({
      handle: (channel: string, listener: Listener) => {
        registered[channel] = listener;
      }
    });

    const event = {
      senderFrame: { url: 'https://evil.example' }
    } as IpcMainInvokeEvent;
    const response = (await registered['parameters.delete']!(event, {
      name: '/a'
    })) as { ok: boolean };
    expect(response.ok).toBe(false);
    expect(send).not.toHaveBeenCalled();
  });
});
