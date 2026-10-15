import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { IpcMainInvokeEvent } from 'electron';
import type { IpcChannel } from '../shared/ipc';

vi.mock('electron-log/main', () => ({ default: { error: vi.fn() } }));
vi.mock('./settings', () => ({
  getAllSettings: vi.fn(() => ({ profile: '' })),
  setSettings: vi.fn(values => values)
}));
vi.mock('./awsProfiles', () => ({
  listProfiles: vi.fn(async () => ({
    profiles: [{ name: 'dev', source: 'config' }],
    envProfile: null
  }))
}));
vi.mock('./updates', () => ({
  checkForRenderer: vi.fn(async () => ({ status: 'up-to-date', version: '1' })),
  openReleasePage: vi.fn(async () => {})
}));
vi.mock('./aws', () => ({
  describeParameters: vi.fn(async () => ({ parameters: [], nextToken: 'n' })),
  getParameters: vi.fn(async () => ({ parameters: [], invalidParameters: [] })),
  putParameter: vi.fn(async () => ({ version: 2 })),
  deleteParameter: vi.fn(async name => ({ name })),
  listKmsAliases: vi.fn(async () => [])
}));

const aws = vi.mocked(await import('./aws'));
const updates = vi.mocked(await import('./updates'));
const { invokeHandler, isTrustedSender, registerIpcHandlers } =
  await import('./ipc');

beforeEach(() => vi.clearAllMocks());

describe('invokeHandler', () => {
  it('wraps results', async () => {
    await expect(
      invokeHandler('ssm:describeParameters', ['token'])
    ).resolves.toEqual({
      ok: true,
      result: { parameters: [], nextToken: 'n' }
    });
    expect(aws.describeParameters).toHaveBeenCalledWith('token');
  });

  it('returns AWS errors as data, keeping the error name', async () => {
    const error = new Error('Parameter not found.');
    error.name = 'ParameterNotFound';
    aws.deleteParameter.mockRejectedValueOnce(error);

    await expect(invokeHandler('ssm:deleteParameter', ['/a'])).resolves.toEqual(
      {
        ok: false,
        error: {
          name: 'ParameterNotFound',
          message: 'Parameter not found.',
          code: 'ParameterNotFound'
        }
      }
    );
  });

  it.each<[IpcChannel, unknown[]]>([
    ['ssm:describeParameters', [42]],
    ['ssm:getParameters', [[]]],
    ['ssm:getParameters', [Array.from({ length: 11 }, (_, i) => `/p${i}`)]],
    ['ssm:getParameters', [['/a', 1]]],
    ['ssm:putParameter', [{ name: '/a', type: 'StringList', value: 'x' }]],
    ['ssm:putParameter', [{ name: '', type: 'String', value: 'x' }]],
    ['ssm:putParameter', [{ name: '/a', type: 'String', value: 1 }]],
    ['ssm:deleteParameter', [undefined]]
  ])('rejects invalid input for %s', async (channel, args) => {
    await expect(invokeHandler(channel, args)).resolves.toMatchObject({
      ok: false,
      error: { name: 'InvalidRequest' }
    });
  });

  it('lists the AWS profiles', async () => {
    await expect(invokeHandler('aws:listProfiles', [])).resolves.toEqual({
      ok: true,
      result: {
        profiles: [{ name: 'dev', source: 'config' }],
        envProfile: null
      }
    });
  });

  it('returns the update check result', async () => {
    await expect(invokeHandler('updates:check', [])).resolves.toEqual({
      ok: true,
      result: { status: 'up-to-date', version: '1' }
    });
    expect(updates.checkForRenderer).toHaveBeenCalledTimes(1);
  });

  it('opens the release page without taking a URL from the renderer', async () => {
    await invokeHandler('updates:openReleasePage', ['https://evil.example']);
    expect(updates.openReleasePage).toHaveBeenCalledWith();
  });

  it('passes only known fields to putParameter', async () => {
    await invokeHandler('ssm:putParameter', [
      {
        name: '/a',
        type: 'SecureString',
        value: 'v',
        kmsKey: 'alias/k',
        overwrite: 'yes',
        Tags: [{ Key: 'x', Value: 'y' }]
      }
    ]);
    expect(aws.putParameter).toHaveBeenCalledWith({
      name: '/a',
      type: 'SecureString',
      value: 'v',
      description: undefined,
      kmsKey: 'alias/k',
      overwrite: false
    });
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

describe('registerIpcHandlers', () => {
  it('refuses calls from untrusted frames', async () => {
    type Listener = (event: IpcMainInvokeEvent, ...args: unknown[]) => unknown;
    const registered: Record<string, Listener> = {};
    registerIpcHandlers({
      handle: (channel: string, listener: Listener) => {
        registered[channel] = listener;
      }
    });

    const event = {
      senderFrame: { url: 'https://evil.example' }
    } as IpcMainInvokeEvent;
    const response = (await registered['ssm:deleteParameter']!(
      event,
      '/a'
    )) as { ok: boolean };
    expect(response.ok).toBe(false);
    expect(aws.deleteParameter).not.toHaveBeenCalled();
  });
});
