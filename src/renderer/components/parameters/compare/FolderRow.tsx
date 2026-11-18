import { Flex } from 'antd';
import { FolderOutlined } from '@ant-design/icons';
import { usePathDelimiter } from '../../../state/settings';
import type { CompareFolderRow } from '../../../utils/compare';
import Mono from '../../common/Mono';
import styles from '../CompareGrid.module.css';
import { CountText } from '../../common/MetaText';

// A header row before a folder's keys, with how many there are.
const FolderRow = ({ row }: { row: CompareFolderRow }) => {
  const delimiter = usePathDelimiter();
  return (
    <div role="row" className={styles.folderRow}>
      <Flex
        component="span"
        align="center"
        gap="small"
        className={styles.folderLabel}
      >
        <FolderOutlined />
        <Mono size="small">{row.folder.slice(0, -delimiter.length)}</Mono>
        <CountText count={row.count} />
      </Flex>
    </div>
  );
};

export default FolderRow;
