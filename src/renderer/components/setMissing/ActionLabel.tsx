import type { ReactNode } from 'react';
import { Typography } from 'antd';
import styles from './SetMissingMenu.module.css';

// A menu action: what it does, and below it a detail.
const ActionLabel = ({
  title,
  detail
}: {
  title: ReactNode;
  detail: string;
}) => (
  <span className={styles.action}>
    <span className={styles.actionTitle}>{title}</span>
    <Typography.Text type="secondary" className={styles.actionDetail}>
      {detail}
    </Typography.Text>
  </span>
);

export default ActionLabel;
