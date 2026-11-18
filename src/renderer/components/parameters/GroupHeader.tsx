import { AppstoreOutlined } from '@ant-design/icons';
import type { GroupRow } from '../../utils/tableRows';
import styles from './ParameterTable.module.css';

// A service's header row in a whole environment's table.
const GroupHeader = ({ row }: { row: GroupRow }) => (
  <span className={styles.group}>
    <AppstoreOutlined />
    <span className={styles.groupName}>{row.service}</span>
    <span className={styles.groupCount}>{row.count}</span>
  </span>
);

export default GroupHeader;
