import React from 'react';
import PropTypes from 'prop-types';
import { Typography } from 'antd';
import { usePathDelimiter } from '../../state/settings';
import { useUiStore } from '../../state/ui';
import { folderOf, leafOf } from '../../utils/paths';
import Mono from '../common/Mono';
import TimeAgo from '../common/TimeAgo';
import styles from './NameCell.module.css';

// The leaf name, and below it the folder relative to the scope and the age.
const NameCell = ({ parameter, selected }) => {
  const delimiter = usePathDelimiter();
  const scope = useUiStore(state => state.scope);
  const { Name, LastModifiedDate } = parameter;
  const relativeFolder = folderOf(Name, delimiter).slice(scope.length);

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

NameCell.propTypes = {
  parameter: PropTypes.shape({
    LastModifiedDate: PropTypes.instanceOf(Date),
    Name: PropTypes.string.isRequired
  }).isRequired,
  selected: PropTypes.bool
};

export default NameCell;
