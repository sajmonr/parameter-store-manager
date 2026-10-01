import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('./settings', () => ({
  availableSettings: { profile: 'profile' },
  getSetting: vi.fn()
}));

const { createCredentialProvider } = await import('./aws');

const ENV_KEYS = [
  'AWS_ACCESS_KEY_ID',
  'AWS_SECRET_ACCESS_KEY',
  'AWS_SESSION_TOKEN',
  'AMAZON_ACCESS_KEY_ID',
  'AMAZON_SECRET_ACCESS_KEY',
  'AMAZON_SESSION_TOKEN'
];

afterEach(() => vi.unstubAllEnvs());

const stubEnv = values =>
  ENV_KEYS.forEach(key => vi.stubEnv(key, values[key] ?? ''));

describe('createCredentialProvider', () => {
  it('prefers AWS_* environment variables', async () => {
    stubEnv({
      AWS_ACCESS_KEY_ID: 'aws-id',
      AWS_SECRET_ACCESS_KEY: 'aws-secret',
      AMAZON_ACCESS_KEY_ID: 'amazon-id',
      AMAZON_SECRET_ACCESS_KEY: 'amazon-secret'
    });

    const credentials = await createCredentialProvider('unused')();
    expect(credentials.accessKeyId).toBe('aws-id');
  });

  it('falls back to AMAZON_* environment variables', async () => {
    stubEnv({
      AMAZON_ACCESS_KEY_ID: 'amazon-id',
      AMAZON_SECRET_ACCESS_KEY: 'amazon-secret',
      AMAZON_SESSION_TOKEN: 'amazon-token'
    });

    const credentials = await createCredentialProvider('unused')();
    expect(credentials).toMatchObject({
      accessKeyId: 'amazon-id',
      secretAccessKey: 'amazon-secret',
      sessionToken: 'amazon-token'
    });
  });
});
