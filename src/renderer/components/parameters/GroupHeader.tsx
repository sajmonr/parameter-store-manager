import { Flex } from 'antd';
import { AppstoreOutlined } from '@ant-design/icons';
import type { GroupRow } from '../../utils/tableRows';
import styles from './ParameterTable.module.css';

// A service's header row in a whole environment's table.
const GroupHeader = ({ row }: { row: GroupRow }) => (
  <Flex component="span" align="center" gap="small" className={styles.group}>
    <AppstoreOutlined />
    <span className={styles.groupName}>{row.service}</span>
    <span className={styles.groupCount}>{row.count}</span>
  </Flex>
);

export default GroupHeader;
