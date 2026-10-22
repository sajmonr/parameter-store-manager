// Where parameters come from. A development build reads a fake, local
// dataset unless PSM_SOURCE is exactly `aws` (npm run dev:aws sets it); a
// packaged build always reads AWS. Anything else, including a typo, reads
// the fake data: reaching AWS from source must be asked for.
import type { DataSource } from '../shared/source';

export const chooseSource = (
  isPackaged: boolean,
  env: NodeJS.ProcessEnv
): DataSource => {
  if (isPackaged) return 'aws';
  return env.PSM_SOURCE === 'aws' ? 'aws' : 'fake';
};

// Set once at startup by ./userData. Until then, and in tests, it is fake,
// so nothing that runs early or without the app can reach AWS.
let current: DataSource = 'fake';

export const setSource = (source: DataSource) => {
  current = source;
};

export const getSource = () => current;

export const isFakeSource = () => current === 'fake';

export type FakeError = 'expired' | 'denied' | 'generic';

export interface FakeOptions {
  // How long each fake AWS call takes, so loading states are visible.
  delayMs: number;
  // The most parameters a describe page returns, so paging is visible.
  pageSize: number;
  // Every fake AWS call fails this way, to try the error screens.
  error: FakeError | null;
}

const ERRORS: readonly FakeError[] = ['expired', 'denied', 'generic'];

const numberOr = (value: string | undefined, fallback: number, min: number) => {
  const parsed = Number(value);
  return value && Number.isFinite(parsed) && parsed >= min
    ? Math.floor(parsed)
    : fallback;
};

// PSM_FAKE_DELAY_MS, PSM_FAKE_PAGE_SIZE and PSM_FAKE_ERROR.
export const fakeOptions = (env: NodeJS.ProcessEnv): FakeOptions => {
  const error = env.PSM_FAKE_ERROR as FakeError | undefined;
  return {
    delayMs: numberOr(env.PSM_FAKE_DELAY_MS, 150, 0),
    pageSize: numberOr(env.PSM_FAKE_PAGE_SIZE, 25, 1),
    error: error && ERRORS.includes(error) ? error : null
  };
};
