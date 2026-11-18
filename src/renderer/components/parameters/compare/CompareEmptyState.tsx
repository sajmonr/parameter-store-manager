import type { ReactNode } from 'react';
import { Typography } from 'antd';
import {
  CheckCircleOutlined,
  FolderOpenOutlined,
  SearchOutlined,
  WarningOutlined
} from '@ant-design/icons';
import { emptyReasonOf } from '../../../utils/compare';
import type {
  CompareFilter,
  Comparison,
  EmptyReason
} from '../../../utils/compare';
import CenteredState from '../../common/CenteredState';
import styles from '../CompareGrid.module.css';

const EmptyState = ({ icon, text }: { icon: ReactNode; text: string }) => (
  <CenteredState vertical gap="small">
    <span className={styles.emptyIcon}>{icon}</span>
    <Typography.Text type="secondary">{text}</Typography.Text>
  </CenteredState>
);

const EMPTY_ICONS: Record<EmptyReason, ReactNode> = {
  noKeys: <FolderOpenOutlined />,
  noMatches: <SearchOutlined />,
  allSet: <CheckCircleOutlined />,
  uncompared: <WarningOutlined />,
  allSame: <CheckCircleOutlined />
};

// Why the filter lists nothing.
const CompareEmptyState = ({
  comparison,
  filter
}: {
  comparison: Comparison;
  filter: CompareFilter;
}) => {
  const { reason, text } = emptyReasonOf(comparison, filter);
  return <EmptyState icon={EMPTY_ICONS[reason]} text={text} />;
};

export default CompareEmptyState;
