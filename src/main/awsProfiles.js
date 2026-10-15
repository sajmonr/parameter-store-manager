import { readFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join } from 'node:path';

// Profile names from the section headers of an AWS shared config file:
// [default] and [profile name] in ~/.aws/config, [name] in ~/.aws/credentials.
// Other config sections such as [sso-session x] are not profiles.
export const parseProfileNames = (text, isConfigFile) => {
  const names = [];
  text.split(/\r?\n/).forEach(line => {
    const match = /^\s*\[\s*([^\]]+?)\s*\]/.exec(line);
    if (!match) return;
    const section = match[1];
    if (!isConfigFile) names.push(section);
    else if (section === 'default') names.push(section);
    else if (/^profile\s/.test(section))
      names.push(section.replace(/^profile\s+/, ''));
  });
  return names;
};

const readOrEmpty = path => readFile(path, 'utf8').catch(() => '');

// Resolves to { profiles: [{ name, source }], envProfile }. Profiles are
// sorted by name; source is 'config' or 'credentials'. envProfile is
// AWS_PROFILE, which the SDK uses when no profile is set, or null. Honors the
// same environment variables as the AWS SDK.
export const listProfiles = async (env = process.env) => {
  const awsDir = join(homedir(), '.aws');
  const [config, credentials] = await Promise.all([
    readOrEmpty(env.AWS_CONFIG_FILE || join(awsDir, 'config')),
    readOrEmpty(env.AWS_SHARED_CREDENTIALS_FILE || join(awsDir, 'credentials'))
  ]);

  const profiles = new Map();
  parseProfileNames(config, true).forEach(name =>
    profiles.set(name, { name, source: 'config' })
  );
  parseProfileNames(credentials, false).forEach(name => {
    if (!profiles.has(name))
      profiles.set(name, { name, source: 'credentials' });
  });
  return {
    profiles: [...profiles.values()].sort((a, b) =>
      a.name.localeCompare(b.name)
    ),
    envProfile: env.AWS_PROFILE || null
  };
};
