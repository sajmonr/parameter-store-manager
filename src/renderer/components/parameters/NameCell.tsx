import { Typography } from 'antd';
import type { ParameterEntry } from '../../state/parameters';
import { usePathDelimiter } from '../../state/settings';
import { useRelativeFolder } from '../../state/views';
import { leafOf } from '../../utils/paths';
import Mono from '../common/Mono';
import TimeAgo from '../common/TimeAgo';
import styles from './NameCell.module.css';

// The leaf name, and below it the folder relative to the location's folder
// and the age.
interface NameCellProps {
  parameter: ParameterEntry;
  selected: boolean;
}

const NameCell = ({ parameter, selected }: NameCellProps) => {
  const delimiter = usePathDelimiter();
  const { Name, LastModifiedDate } = parameter;
  const relativeFolder = useRelativeFolder(Name);

  return (
    <div className={styles.cell}>
      <Mono
        size={13}
        weight={600}
        ellipsis
        className={selected ? styles.selected : undefined}
      >
        {leafOf(Name, delimiter)}
      </Mono>
      <Typography.Text type="secondary" ellipsis className={styles.meta}>
        {relativeFolder && `${relativeFolder} · `}
        <TimeAgo date={LastModifiedDate} />
      </Typography.Text>
    </div>
  );
};

export default NameCell;
