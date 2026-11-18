import { Flex, Typography } from 'antd';
import { formatExportedAt } from '../../../utils/dates';
import { plural } from '../../../utils/plural';
import Mono from '../../common/Mono';
import { FORMAT_ICONS } from '../formatIcons';
import type { LoadedFile } from '../ImportPanel';
import styles from '../ImportReview.module.css';

// The file: its format, name, size, export date and region.
const ReviewHeader = ({ file }: { file: LoadedFile }) => {
  const { parameters, exportedAt, region } = file.data;
  const meta = [
    plural(parameters.length, 'parameter'),
    formatExportedAt(exportedAt) && `exported ${formatExportedAt(exportedAt)}`,
    region
  ].filter(Boolean);
  return (
    <Flex align="center" gap="small">
      <span className={styles.fileIcon}>{FORMAT_ICONS[file.format]}</span>
      <Flex vertical className={styles.fileTitle}>
        <Mono ellipsis={{ tooltip: file.name }}>{file.name}</Mono>
        <Typography.Text type="secondary" className={styles.meta}>
          {meta.join(' · ')}
        </Typography.Text>
      </Flex>
    </Flex>
  );
};

export default ReviewHeader;
