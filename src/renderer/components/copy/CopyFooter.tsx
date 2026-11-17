import { Button, Flex, Typography } from 'antd';
import { WarningFilled } from '@ant-design/icons';
import type { copySummary } from '../../utils/copyValue';
import styles from './CopyModal.module.css';

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
  <div className={styles.footer}>
    <div className={styles.summary}>
      {count ? (
        <Typography.Text>
          {summary.overwrites > 0 && (
            <WarningFilled className={styles.overwriteIcon} />
          )}
          {summary.text}
        </Typography.Text>
      ) : (
        <Typography.Text type="secondary">
          Select the environments to copy to
        </Typography.Text>
      )}
      <Typography.Text type="secondary" className={styles.hint}>
        Only the value is copied. Types and descriptions in the targets stay as
        they are.
      </Typography.Text>
    </div>
    <Flex gap={8} className={styles.buttons}>
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
  </div>
);

export default CopyFooter;
