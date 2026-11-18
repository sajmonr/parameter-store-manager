import { FolderOutlined } from '@ant-design/icons';
import { usePathDelimiter } from '../../../state/settings';
import type { CompareFolderRow } from '../../../utils/compare';
import Mono from '../../common/Mono';
import styles from '../CompareGrid.module.css';

// A header row before a folder's keys, with how many there are.
const FolderRow = ({ row }: { row: CompareFolderRow }) => {
  const delimiter = usePathDelimiter();
  return (
    <div role="row" className={styles.folderRow}>
      <span className={styles.folderLabel}>
        <FolderOutlined />
        <Mono size="small">{row.folder.slice(0, -delimiter.length)}</Mono>
        <span className={styles.envCount}>{row.count}</span>
      </span>
    </div>
  );
};

export default FolderRow;
