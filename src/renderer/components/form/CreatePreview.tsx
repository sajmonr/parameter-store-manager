import { Button, Flex } from 'antd';
import { CheckCircleFilled, CloseCircleFilled } from '@ant-design/icons';
import { uiActions } from '../../state/ui';
import EnvironmentDot from '../common/EnvironmentDot';
import { breakable } from '../../utils/paths';
import Mono from '../common/Mono';
import styles from './CreatePreview.module.css';
import { cx } from '../../utils/classNames';
import MetaText from '../common/MetaText';
import HintText from '../common/HintText';

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
  <Flex component="li" vertical gap="var(--ant-margin-xxs)">
    <Flex align="baseline" gap="small">
      {row.color && <EnvironmentDot color={row.color} className={styles.dot} />}
      <Mono size="small" className={styles.path}>
        {breakable(row.name, delimiter)}
      </Mono>
    </Flex>
    {row.meta && <MetaText>{row.meta}</MetaText>}
    {row.created && (
      <Flex align="center" justify="space-between" gap="small">
        <Flex
          component="span"
          align="center"
          gap="var(--ant-margin-xxs)"
          className={cx(styles.tag, styles.created)}
        >
          <CheckCircleFilled />
          Created
        </Flex>
      </Flex>
    )}
    {row.error && <HintText type="danger">{row.error}</HintText>}
    {row.exists && !row.created && (
      <Flex align="center" gap="small">
        <Flex
          component="span"
          align="center"
          gap="var(--ant-margin-xxs)"
          className={cx(styles.tag, styles.exists)}
        >
          <CloseCircleFilled />
          Already exists
        </Flex>
        <Button
          size="small"
          className={styles.open}
          onClick={() => uiActions.selectParameter(row.name)}
        >
          Open →
        </Button>
      </Flex>
    )}
  </Flex>
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
    <MetaText className={styles.label}>
      {rows.length > 1 ? `Creates ${rows.length} parameters` : 'Creates'}
    </MetaText>
    <Flex component="ul" vertical gap="small" className={styles.rows}>
      {rows.map(row => (
        <Row key={row.name} row={row} delimiter={delimiter} />
      ))}
    </Flex>
  </div>
);

export default CreatePreview;
