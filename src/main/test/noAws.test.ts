import { createServer, connect } from 'node:net';
import type { AddressInfo } from 'node:net';
import { describe, expect, it, vi } from 'vitest';
import { DescribeParametersCommand, SSMClient } from '@aws-sdk/client-ssm';
import { NETWORK_BLOCKED_MESSAGE } from './noAws';

vi.mock('../settings', () => ({
  availableSettings: { profile: 'profile' },
  getSetting: vi.fn()
}));

const { createCredentialProvider } = await import('../aws');

// A request the app would really make, with a single attempt.
const describeParameters = (
  config: Partial<ConstructorParameters<typeof SSMClient>[0]> = {}
) =>
  new SSMClient({ region: 'us-east-1', maxAttempts: 1, ...config }).send(
    new DescribeParametersCommand({})
  );

describe('the no-AWS test guard', () => {
  it('leaves no AWS or app variables from the shell', () => {
    const leaked = Object.keys(process.env).filter(
      key =>
        (key.startsWith('AWS_') || key.startsWith('PSM_')) &&
        ![
          'AWS_CONFIG_FILE',
          'AWS_SHARED_CREDENTIALS_FILE',
          'AWS_EC2_METADATA_DISABLED'
        ].includes(key)
    );
    expect(leaked).toEqual([]);
    expect(process.env.AWS_CONFIG_FILE).not.toContain('.aws');
    expect(process.env.AWS_SHARED_CREDENTIALS_FILE).not.toContain('.aws');
  });

  it("finds no credentials, so ~/.aws isn't used", async () => {
    await expect(createCredentialProvider('')()).rejects.toThrow();
    await expect(createCredentialProvider('default')()).rejects.toThrow();
  });

  it('blocks a signed SSM request before it leaves the machine', async () => {
    await expect(
      describeParameters({
        credentials: { accessKeyId: 'x', secretAccessKey: 'y' }
      })
    ).rejects.toThrow(NETWORK_BLOCKED_MESSAGE);
  });

  it('blocks fetch to anywhere else', async () => {
    const error = await fetch('https://example.com').catch(e => e);
    expect(String(error?.cause ?? error)).toContain(NETWORK_BLOCKED_MESSAGE);
  });

  it('still allows connections to this machine', async () => {
    const server = createServer(socket => socket.end('ok'));
    await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
    const { port } = server.address() as AddressInfo;
    const reply = await new Promise<string>((resolve, reject) => {
      const socket = connect(port, '127.0.0.1');
      socket.on('data', data => resolve(String(data)));
      socket.on('error', reject);
    });
    server.close();
    expect(reply).toBe('ok');
  });
});
