import { useParameters } from '../../state/parameters';
import type { LoadState } from '../../state/parameters';
import { useUiStore } from '../../state/ui';
import {
  useLoaded,
  useSelectedParameter,
  useVisibleParameters
} from '../../state/views';
import { plural } from '../../utils/plural';
import type { Compared } from './ParameterBrowser';
import SyncStatus from './SyncStatus';
import styles from './StatusBar.module.css';

// Counts wait for the first load, like the sidebar's and the tabs'.
const statusText = (
  loadState: LoadState,
  loaded: boolean,
  visible: number,
  total: number,
  compared: Compared | null
) => {
  if (loadState === 'loading' || !loaded) return 'Loading…';
  if (loadState !== 'ready') return '—';
  if (!compared) return `${visible} of ${total} parameters`;
  const { comparison, keys } = compared;
  return `${keys.length} of ${plural(comparison.total, 'key')} · ${plural(comparison.environments.length, 'environment')}`;
};

// The rows listed and the sync state, with the keys that work: the arrow
// keys move between rows, but not between compared keys, and Esc closes an
// open parameter.
const StatusBar = ({ compared }: { compared: Compared | null }) => {
  const { loadState, parameters } = useParameters();
  const visible = useVisibleParameters().length;
  const total = parameters.length;
  const loaded = useLoaded();
  const paneMode = useUiStore(state => state.paneMode);
  const selected = useSelectedParameter();
  // When the pane shows a parameter, as in DetailHost.
  const detailOpen =
    paneMode === 'detail' && !!selected && loadState === 'ready';
  const hints = [
    !compared && '↑↓ move',
    detailOpen && 'Esc close details'
  ].filter(Boolean);

  return (
    <div className={styles.bar}>
      <span className={styles.start}>
        <span>{statusText(loadState, loaded, visible, total, compared)}</span>
        <SyncStatus />
      </span>
      {hints.length > 0 && <span>{hints.join(' · ')}</span>}
    </div>
  );
};

export default StatusBar;
