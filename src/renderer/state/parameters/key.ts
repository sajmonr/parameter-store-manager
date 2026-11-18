import { getSettings } from '../settings';

export const parametersKey = (profile: string, region: string) =>
  ['parameters', profile, region] as const;

export type ParametersKey = ReturnType<typeof parametersKey>;

export const currentKey = () => {
  const { profile, ssmRegion } = getSettings();
  return parametersKey(profile, ssmRegion);
};
