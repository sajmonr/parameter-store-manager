import { Typography } from 'antd';
import styles from './PageHeading.module.css';

// A page's title and the line under it.
const PageHeading = ({
  title,
  description
}: {
  title: string;
  description: string;
}) => (
  <div className={styles.heading}>
    <Typography.Title level={4} className={styles.title}>
      {title}
    </Typography.Title>
    <Typography.Text type="secondary">{description}</Typography.Text>
  </div>
);

export default PageHeading;
