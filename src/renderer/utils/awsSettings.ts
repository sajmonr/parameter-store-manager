// The choices on the AWS connection settings.
import type { ListProfilesResponse } from '../../main/endpoints/aws/listProfiles/listProfiles.contract';
import { DEFAULT_PROFILE_NAME } from '../../shared/aws';
import { AWS_REGIONS } from './awsRegions';

export const regionOptions = (current: string) =>
  [...new Set([...AWS_REGIONS, current].filter(Boolean))]
    .sort()
    .map(region => ({ value: region, label: region }));

// The empty profile means the SDK default: AWS_PROFILE if set, otherwise the
// profile named "default". Without AWS_PROFILE the two are the same, so the
// empty profile is shown as "default"; with it, both are listed.
export const profileChoices = (
  { profiles, envProfile }: ListProfilesResponse,
  current: string
) => {
  const sourceText = (name: string) => {
    const found = profiles.find(p => p.name === name);
    return found && `from ~/.aws/${found.source}`;
  };
  const names = profiles
    .map(p => p.name)
    .filter(name => envProfile || name !== DEFAULT_PROFILE_NAME);
  if (current && !names.includes(current)) names.unshift(current);
  const sdkDefault = envProfile
    ? { value: '', name: 'SDK default', suffix: `AWS_PROFILE=${envProfile}` }
    : {
        value: '',
        name: DEFAULT_PROFILE_NAME,
        suffix: sourceText(DEFAULT_PROFILE_NAME)
      };
  return [
    sdkDefault,
    ...names.map(name => ({ value: name, name, suffix: sourceText(name) }))
  ];
};
