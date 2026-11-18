import type { ReactNode } from 'react';
import { Typography, Flex } from 'antd';
import styles from './SetMissingMenu.module.css';

// A menu action: what it does, and below it a detail.
const ActionLabel = ({
  title,
  detail
}: {
  title: ReactNode;
  detail: string;
}) => (
  <Flex component="span" vertical className={styles.action}>
    <Flex component="span">{title}</Flex>
    <Typography.Text type="secondary" className={styles.actionDetail}>
      {detail}
    </Typography.Text>
  </Flex>
);

export default ActionLabel;
