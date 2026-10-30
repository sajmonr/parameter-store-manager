import type { Compared } from './compare';
import { EMPTY_VALUE } from './labels';
import type { LoadState } from './parameterList';
import { plural } from './plural';

// Counts wait for the first load, like the sidebar's and the tabs'.
export const statusText = (
  loadState: LoadState,
  loaded: boolean,
  visible: number,
  total: number,
  compared: Compared | null
) => {
  if (loadState === 'loading' || !loaded) return 'Loading…';
  if (loadState !== 'ready') return EMPTY_VALUE;
  if (!compared) return `${visible} of ${total} parameters`;
  const { comparison, keys } = compared;
  return `${keys.length} of ${plural(comparison.total, 'key')} · ${plural(comparison.environments.length, 'environment')}`;
};
