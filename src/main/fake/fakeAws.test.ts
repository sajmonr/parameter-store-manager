import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  DescribeInstanceInformationCommand,
  DescribeParametersCommand,
  GetParametersCommand,
  PutParameterCommand,
  SSMClient
} from '@aws-sdk/client-ssm';
import { KMSClient, paginateListAliases } from '@aws-sdk/client-kms';
import { GetCallerIdentityCommand, STSClient } from '@aws-sdk/client-sts';
import { startFakeSource, withFakeSource } from './fakeAws';
import type { FakeOptions } from '../source';

const credentials = async () => ({ accessKeyId: 'x', secretAccessKey: 'y' });

const start = (options: Partial<FakeOptions> = {}) => {
  const dir = mkdtempSync(join(tmpdir(), 'psm-fake-aws-'));
  const fixture = join(dir, 'fixture.json');
  writeFileSync(
    fixture,
    JSON.stringify({
      accountId: '123456789012',
      aliases: [{ AliasName: 'alias/aws/ssm', TargetKeyId: 'key-1' }],
      parameters: [
        {
          Name: '/a/One',
          Type: 'String',
          Value: 'one',
          Version: 1,
          LastModifiedDate: '2026-01-01T00:00:00.000Z'
        }
      ]
    })
  );
  startFakeSource(fixture, join(dir, 'working.json'), {
    delayMs: 0,
    pageSize: 50,
    error: null,
    ...options
  });
};

const ssm = () =>
  withFakeSource(new SSMClient({ region: 'us-east-1', credentials }));

describe('the fake source', () => {
  it('answers SSM commands without reaching AWS', async () => {
    start();
    const client = ssm();
    const page = await client.send(new DescribeParametersCommand({}));
    expect(page.Parameters!.map(p => p.Name)).toEqual(['/a/One']);

    await client.send(
      new PutParameterCommand({ Name: '/a/Two', Type: 'String', Value: 'two' })
    );
    const values = await client.send(
      new GetParametersCommand({ Names: ['/a/Two'] })
    );
    expect(values.Parameters![0]!.Value).toBe('two');
  });

  it('answers the KMS paginator and STS', async () => {
    start();
    const kms = withFakeSource(
      new KMSClient({ region: 'us-east-1', credentials })
    );
    const aliases = [];
    for await (const page of paginateListAliases({ client: kms }, {})) {
      aliases.push(...page.Aliases!);
    }
    expect(aliases.map(a => a.AliasName)).toEqual(['alias/aws/ssm']);

    const sts = withFakeSource(
      new STSClient({ region: 'us-east-1', credentials })
    );
    const identity = await sts.send(new GetCallerIdentityCommand({}));
    expect(identity.Account).toBe('123456789012');
  });

  it('fails the way AWS does when told to', async () => {
    start({ error: 'expired' });
    await expect(
      ssm().send(new DescribeParametersCommand({}))
    ).rejects.toMatchObject({ name: 'ExpiredTokenException' });
    start({ error: 'denied' });
    await expect(
      ssm().send(new DescribeParametersCommand({}))
    ).rejects.toMatchObject({ name: 'AccessDeniedException' });
  });

  it('refuses commands it cannot answer', async () => {
    start();
    await expect(
      ssm().send(new DescribeInstanceInformationCommand({}))
    ).rejects.toMatchObject({ name: 'UnsupportedFakeCommand' });
  });
});
