import { Flex } from 'antd';
import { useParameters } from '../../state/parameters';
import { useUiStore } from '../../state/ui';
import {
  useLoaded,
  useSelectedParameter,
  useVisibleParameters
} from '../../state/views';
import type { Compared } from '../../utils/compare';
import { statusText } from '../../utils/statusText';
import SyncStatus from './SyncStatus';
import styles from './StatusBar.module.css';

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
    <Flex align="center" justify="space-between" className={styles.bar}>
      <Flex
        component="span"
        align="center"
        gap="small"
        className={styles.start}
      >
        <span>{statusText(loadState, loaded, visible, total, compared)}</span>
        <SyncStatus />
      </Flex>
      {hints.length > 0 && <span>{hints.join(' · ')}</span>}
    </Flex>
  );
};

export default StatusBar;
