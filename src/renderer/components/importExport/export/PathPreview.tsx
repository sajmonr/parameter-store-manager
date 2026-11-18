import { Typography, Flex } from 'antd';
import Mono from '../../common/Mono';
import styles from '../ExportPanel.module.css';

const PREVIEW_SIZE = 5;

// The first few names the path matches.
const PathPreview = ({ names }: { names: string[] }) => {
  if (!names.length) {
    return (
      <Typography.Text type="warning">
        No parameters match this path.
      </Typography.Text>
    );
  }
  const rest = names.length - PREVIEW_SIZE;
  return (
    <Flex
      component="ul"
      vertical
      gap="var(--ant-margin-xxs)"
      className={styles.preview}
      aria-label="Matching parameters"
    >
      {names.slice(0, PREVIEW_SIZE).map(name => (
        <li key={name}>
          <Mono ellipsis={{ tooltip: name }} className={styles.previewName}>
            {name}
          </Mono>
        </li>
      ))}
      {rest > 0 && (
        <li>
          <Typography.Text type="secondary">
            and {rest.toLocaleString()} more
          </Typography.Text>
        </li>
      )}
    </Flex>
  );
};

export default PathPreview;
