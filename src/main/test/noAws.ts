/**
 * Runs before every test file (see vitest.config.ts), so no test can reach
 * AWS, whatever it mocks or forgets to mock. Real AWS access is never
 * needed in tests.
 *
 * - The AWS and app variables of the shell are removed, so no credentials,
 *   profile or `PSM_SOURCE=aws` leak in.
 * - The SDK's config and credentials files point at a path that doesn't
 *   exist, so ~/.aws is never read, and the EC2 metadata lookup is off.
 * - Every outgoing TCP connection to anything but this machine fails with
 *   NETWORK_BLOCKED_MESSAGE.
 *
 * src/main/test/noAws.test.ts checks that each of these holds.
 */
import { Socket } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

export const NETWORK_BLOCKED_MESSAGE =
  'Network access is blocked in tests (src/main/test/noAws.ts).';

const NO_AWS_DIR = join(tmpdir(), 'psm-tests-no-aws-config');

Object.keys(process.env).forEach(key => {
  if (key.startsWith('AWS_') || key.startsWith('PSM_')) delete process.env[key];
});
Object.assign(process.env, {
  AWS_CONFIG_FILE: join(NO_AWS_DIR, 'config'),
  AWS_SHARED_CREDENTIALS_FILE: join(NO_AWS_DIR, 'credentials'),
  AWS_EC2_METADATA_DISABLED: 'true'
});

const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '::1', '']);

interface ConnectOptions {
  host?: string;
  path?: string;
}

// net.connect, tls.connect, http(s) agents and fetch all end up here.
// Arguments are (options), (port, host) or (path), each with an optional
// callback.
const hostOf = (args: unknown[]) => {
  const [first, second] = args;
  if (first && typeof first === 'object') {
    const { host, path } = first as ConnectOptions;
    return path ? '' : (host ?? 'localhost');
  }
  if (typeof first === 'string' && Number.isNaN(Number(first))) return '';
  return typeof second === 'string' ? second : 'localhost';
};

const connect = Socket.prototype.connect;
Socket.prototype.connect = function guardedConnect(
  this: Socket,
  ...args: unknown[]
) {
  const host = hostOf(args);
  if (!LOCAL_HOSTS.has(host)) {
    const error = new Error(`${NETWORK_BLOCKED_MESSAGE} Tried: ${host}`);
    process.nextTick(() => this.destroy(error));
    return this;
  }
  return (connect as (...a: unknown[]) => Socket).apply(this, args);
} as typeof Socket.prototype.connect;
