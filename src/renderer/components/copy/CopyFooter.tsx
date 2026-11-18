import { Button, Flex, Typography } from 'antd';
import { WarningFilled } from '@ant-design/icons';
import type { copySummary } from '../../utils/copyValue';
import styles from './CopyModal.module.css';
import HintText from '../common/HintText';

interface CopyFooterProps {
  count: number;
  summary: ReturnType<typeof copySummary>;
  okText: string;
  canCopy: boolean;
  copying: boolean;
  onCancel: () => void;
  onCopy: () => void;
}

// What the copy will do, and the buttons.
const CopyFooter = ({
  count,
  summary,
  okText,
  canCopy,
  copying,
  onCancel,
  onCopy
}: CopyFooterProps) => (
  <Flex align="flex-end" gap="middle" className={styles.footer}>
    <Flex vertical gap="var(--ant-margin-xxs)" className={styles.summary}>
      {count ? (
        <Typography.Text>
          {summary.overwrites > 0 && (
            <WarningFilled className={styles.overwriteIcon} />
          )}
          {summary.text}
        </Typography.Text>
      ) : (
        <HintText>Select the environments to copy to</HintText>
      )}
      <HintText>
        Only the value is copied. Types and descriptions in the targets stay as
        they are.
      </HintText>
    </Flex>
    <Flex gap="small" className={styles.buttons}>
      <Button onClick={onCancel} disabled={copying}>
        Cancel
      </Button>
      <Button
        type="primary"
        disabled={!count || !canCopy}
        loading={copying}
        onClick={onCopy}
      >
        {okText}
      </Button>
    </Flex>
  </Flex>
);

export default CopyFooter;
