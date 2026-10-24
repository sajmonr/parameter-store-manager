import { useParameters } from '../../state/parameters';
import type { LoadState } from '../../state/parameters';
import { useVisibleParameters } from '../../state/views';
import { plural } from '../../utils/plural';
import type { Compared } from './ParameterBrowser';
import SyncStatus from './SyncStatus';
import styles from './StatusBar.module.css';

const statusText = (
  loadState: LoadState,
  visible: number,
  total: number,
  compared: Compared | null
) => {
  if (loadState === 'loading') return 'Loading…';
  if (loadState !== 'ready') return '—';
  if (!compared) return `${visible} of ${total} parameters`;
  const { comparison, keys } = compared;
  return `${keys.length} of ${plural(comparison.total, 'key')} · ${plural(comparison.environments.length, 'environment')}`;
};

// The rows listed and the sync state. Comparing lists keys, and the arrow
// keys don't move between them.
const StatusBar = ({ compared }: { compared: Compared | null }) => {
  const { loadState, parameters } = useParameters();
  const visible = useVisibleParameters().length;
  const total = parameters.length;

  return (
    <div className={styles.bar}>
      <span className={styles.start}>
        <span>{statusText(loadState, visible, total, compared)}</span>
        <SyncStatus />
      </span>
      <span>{compared ? 'Esc close' : '↑↓ move · Esc close'}</span>
    </div>
  );
};

export default StatusBar;
