import { useParameters } from '../../state/parameters';
import type { LoadState } from '../../state/parameters';
import { useVisibleParameters } from '../../state/views';
import styles from './StatusBar.module.css';

const statusText = (loadState: LoadState, visible: number, total: number) => {
  if (loadState === 'loading') return 'Loading…';
  if (loadState === 'ready') return `${visible} of ${total} parameters`;
  return '—';
};

const StatusBar = () => {
  const { loadState, parameters } = useParameters();
  const visible = useVisibleParameters().length;
  const total = parameters.length;

  return (
    <div className={styles.bar}>
      <span>{statusText(loadState, visible, total)}</span>
      <span>↑↓ move · Esc close</span>
    </div>
  );
};

export default StatusBar;
