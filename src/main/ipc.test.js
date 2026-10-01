import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('electron-log/main', () => ({ default: { error: vi.fn() } }));
vi.mock('./settings', () => ({
  getAllSettings: vi.fn(() => ({ profile: '' })),
  setSettings: vi.fn(values => values)
}));
vi.mock('./aws', () => ({
  describeParameters: vi.fn(async () => ({ parameters: [], nextToken: 'n' })),
  getParameters: vi.fn(async () => ({ parameters: [], invalidParameters: [] })),
  putParameter: vi.fn(async () => ({ version: 2 })),
  deleteParameter: vi.fn(async name => ({ name })),
  listKmsAliases: vi.fn(async () => [])
}));

const aws = await import('./aws');
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

  it.each([
    ['ssm:describeParameters', [42]],
    ['ssm:getParameters', [[]]],
    ['ssm:getParameters', [Array.from({ length: 11 }, (_, i) => `/p${i}`)]],
    ['ssm:getParameters', [['/a', 1]]],
    ['ssm:putParameter', [{ name: '/a', type: 'StringList', value: 'x' }]],
    ['ssm:putParameter', [{ name: '', type: 'String', value: 'x' }]],
    ['ssm:putParameter', [{ name: '/a', type: 'String', value: 1 }]],
    ['ssm:deleteParameter', [undefined]]
  ])('rejects invalid input for %s', async (channel, args) => {
    const response = await invokeHandler(channel, args);
    expect(response.ok).toBe(false);
    expect(response.error.name).toBe('InvalidRequest');
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
    const registered = {};
    registerIpcHandlers({ handle: (ch, fn) => (registered[ch] = fn) });

    const response = await registered['ssm:deleteParameter'](
      { senderFrame: { url: 'https://evil.example' } },
      '/a'
    );
    expect(response.ok).toBe(false);
    expect(aws.deleteParameter).not.toHaveBeenCalled();
  });
});
