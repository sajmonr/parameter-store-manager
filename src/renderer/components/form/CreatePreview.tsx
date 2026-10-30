import { Button, Typography } from 'antd';
import { CheckCircleFilled, CloseCircleFilled } from '@ant-design/icons';
import { uiActions } from '../../state/ui';
import EnvironmentDot from '../common/EnvironmentDot';
import { breakable } from '../../utils/paths';
import Mono from '../common/Mono';
import styles from './CreatePreview.module.css';
import { cx } from '../../utils/classNames';

export interface PreviewRow {
  name: string;
  // The environment's colour when the name fits the structure.
  color: string | null;
  // How the name is grouped: 'compass · development' or 'Other paths'.
  meta: string | null;
  exists: boolean;
  // After a create that partly failed.
  created?: boolean;
  error?: string;
}

const Row = ({ row, delimiter }: { row: PreviewRow; delimiter: string }) => (
  <li className={styles.row}>
    <div className={styles.name}>
      {row.color && <EnvironmentDot color={row.color} className={styles.dot} />}
      <Mono size={12} className={styles.path}>
        {breakable(row.name, delimiter)}
      </Mono>
    </div>
    {row.meta && (
      <Typography.Text type="secondary" className={styles.meta}>
        {row.meta}
      </Typography.Text>
    )}
    {row.created && (
      <div className={styles.status}>
        <span className={cx(styles.tag, styles.created)}>
          <CheckCircleFilled />
          Created
        </span>
      </div>
    )}
    {row.error && (
      <Typography.Text type="danger" className={styles.meta}>
        {row.error}
      </Typography.Text>
    )}
    {row.exists && !row.created && (
      <div className={styles.status}>
        <span className={cx(styles.tag, styles.exists)}>
          <CloseCircleFilled />
          Already exists
        </span>
        <Button
          size="small"
          className={styles.open}
          onClick={() => uiActions.selectParameter(row.name)}
        >
          Open →
        </Button>
      </div>
    )}
  </li>
);

// What the form will create, one row per parameter.
const CreatePreview = ({
  rows,
  delimiter
}: {
  rows: PreviewRow[];
  delimiter: string;
}) => (
  <div className={styles.well}>
    <Typography.Text type="secondary" className={styles.label}>
      {rows.length > 1 ? `Creates ${rows.length} parameters` : 'Creates'}
    </Typography.Text>
    <ul className={styles.rows}>
      {rows.map(row => (
        <Row key={row.name} row={row} delimiter={delimiter} />
      ))}
    </ul>
  </div>
);

export default CreatePreview;
