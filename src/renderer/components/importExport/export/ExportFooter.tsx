import { Button, Flex, Progress, Typography } from 'antd';
import { exportActions } from '../../../state/export';
import { plural } from '../../../utils/plural';
import type { ExportProgress } from '../../../utils/progress';
import styles from '../ExportPanel.module.css';

interface ExportFooterProps {
  progress: ExportProgress | null;
  status: string | null;
  exporting: boolean;
  canExport: boolean;
  count: number;
  formatLabel: string;
  onExport: () => void;
}

// The export's progress and status, and the buttons.
const ExportFooter = ({
  progress,
  status,
  exporting,
  canExport,
  count,
  formatLabel,
  onExport
}: ExportFooterProps) => (
  <Flex vertical gap="small">
    {progress?.phase === 'values' && (
      <Progress
        percent={progress.total ? (progress.done / progress.total) * 100 : 100}
        showInfo={false}
        size="small"
      />
    )}
    <Flex justify="flex-end" align="center" gap="small">
      {status && (
        <Typography.Text type="secondary" className={styles.status}>
          {status}
        </Typography.Text>
      )}
      {/* Once the file is being saved, the export can't be stopped. */}
      {exporting && (
        <Button
          onClick={exportActions.cancel}
          disabled={progress?.phase === 'saving'}
        >
          Cancel
        </Button>
      )}
      <Button
        type="primary"
        disabled={!canExport && !exporting}
        loading={exporting}
        onClick={onExport}
      >
        Export {plural(count, 'parameter')} as {formatLabel}
      </Button>
    </Flex>
  </Flex>
);

export default ExportFooter;
