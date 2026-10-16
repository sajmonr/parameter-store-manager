import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { listProfiles, parseProfileNames } from './awsProfiles';

const config = `
[default]
region = us-east-1

[profile dev]
sso_session = corp

[sso-session corp]
sso_start_url = https://example.awsapps.com/start

[ profile  prod ]
region = eu-west-1
`;

const credentials = `
[default]
aws_access_key_id = x
[legacy]
aws_access_key_id = y
`;

describe('parseProfileNames', () => {
  it('reads profiles from a config file and skips other sections', () => {
    expect(parseProfileNames(config, true)).toEqual(['default', 'dev', 'prod']);
  });

  it('reads every section of a credentials file', () => {
    expect(parseProfileNames(credentials, false)).toEqual([
      'default',
      'legacy'
    ]);
  });
});

describe('listProfiles', () => {
  let dir: string;
  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), 'aws-profiles-'));
  });
  afterEach(() => rm(dir, { recursive: true, force: true }));

  it('merges both files, preferring the config file as the source', async () => {
    await writeFile(join(dir, 'config'), config);
    await writeFile(join(dir, 'credentials'), credentials);
    const { profiles, envProfile } = await listProfiles({
      AWS_CONFIG_FILE: join(dir, 'config'),
      AWS_SHARED_CREDENTIALS_FILE: join(dir, 'credentials'),
      AWS_PROFILE: 'dev'
    });
    expect(envProfile).toBe('dev');
    expect(profiles).toEqual([
      { name: 'default', source: 'config' },
      { name: 'dev', source: 'config' },
      { name: 'legacy', source: 'credentials' },
      { name: 'prod', source: 'config' }
    ]);
  });

  it('returns nothing when the files are missing', async () => {
    expect(
      await listProfiles({
        AWS_CONFIG_FILE: join(dir, 'nope'),
        AWS_SHARED_CREDENTIALS_FILE: join(dir, 'nope2')
      })
    ).toEqual({ profiles: [], envProfile: null });
  });
});
