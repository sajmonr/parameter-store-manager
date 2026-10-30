import { getSettings } from './settings';

// Returns a check that throws `message` once the profile or region differs
// from now: work that started under one account or region must not carry on
// in another.
export const sourceGuard = (message: string) => {
  const { profile, ssmRegion } = getSettings();
  return () => {
    const now = getSettings();
    if (now.profile !== profile || now.ssmRegion !== ssmRegion) {
      throw new Error(message);
    }
  };
};
