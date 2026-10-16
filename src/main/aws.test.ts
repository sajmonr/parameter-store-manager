import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('./settings', () => ({
  availableSettings: { profile: 'profile' },
  getSetting: vi.fn()
}));

const { createCredentialProvider } = await import('./aws');

const ENV_KEYS = [
  'AWS_ACCESS_KEY_ID',
  'AWS_SECRET_ACCESS_KEY',
  'AWS_SESSION_TOKEN'
];

afterEach(() => vi.unstubAllEnvs());

const stubEnv = (values: Partial<Record<string, string>>) =>
  ENV_KEYS.forEach(key => vi.stubEnv(key, values[key] ?? ''));

describe('createCredentialProvider', () => {
  it('prefers AWS_* environment variables over the profile', async () => {
    stubEnv({
      AWS_ACCESS_KEY_ID: 'aws-id',
      AWS_SECRET_ACCESS_KEY: 'aws-secret',
      AWS_SESSION_TOKEN: 'aws-token'
    });

    const credentials = await createCredentialProvider('unused')();
    expect(credentials).toMatchObject({
      accessKeyId: 'aws-id',
      secretAccessKey: 'aws-secret',
      sessionToken: 'aws-token'
    });
  });
});
