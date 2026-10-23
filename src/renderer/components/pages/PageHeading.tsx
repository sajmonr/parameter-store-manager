import type { ReactNode } from 'react';
import { Typography } from 'antd';
import styles from './PageHeading.module.css';

// A page's title and the line under it, with `extra` controls on the right.
const PageHeading = ({
  title,
  description,
  extra
}: {
  title: string;
  description: string;
  extra?: ReactNode;
}) => (
  <div className={styles.heading}>
    <div className={styles.text}>
      <Typography.Title level={4} className={styles.title}>
        {title}
      </Typography.Title>
      <Typography.Text type="secondary">{description}</Typography.Text>
    </div>
    {extra}
  </div>
);

export default PageHeading;
