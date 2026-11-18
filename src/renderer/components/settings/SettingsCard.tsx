import type { ReactNode } from 'react';
import { Card } from 'antd';
import styles from './Settings.module.css';
import HintText from '../common/HintText';

interface SettingsCardProps {
  title: string;
  description: string;
  // Tables reach the card's edges.
  flush?: boolean;
  children: ReactNode;
}

// A card with a title and the line under it in its header.
const SettingsCard = ({
  title,
  description,
  flush,
  children
}: SettingsCardProps) => (
  <Card
    title={
      <>
        {title}
        <HintText className={styles.cardDescription}>{description}</HintText>
      </>
    }
    classNames={{
      header: styles.cardHeader,
      title: styles.cardTitle,
      body: flush ? styles.flushBody : undefined
    }}
  >
    {children}
  </Card>
);

export default SettingsCard;
