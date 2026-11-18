import type { ReactNode } from 'react';
import { Flex } from 'antd';
import styles from './SetMissingMenu.module.css';
import HintText from '../common/HintText';

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
    <HintText className={styles.actionDetail}>{detail}</HintText>
  </Flex>
);

export default ActionLabel;
