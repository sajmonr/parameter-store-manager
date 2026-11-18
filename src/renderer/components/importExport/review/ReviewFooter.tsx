import { Alert, Button, Flex, Typography } from 'antd';
import {
  importDuration,
  SLOW_IMPORT_WRITES,
  WRITES_PER_SECOND
} from '../../../utils/importPlan';
import { WAITING_FOR_PARAMETERS } from '../../../utils/labels';
import { plural } from '../../../utils/plural';
import { countOf } from '../../../utils/progress';
import PartialFailureAlert from '../../common/PartialFailureAlert';
import styles from '../ImportReview.module.css';

interface ReviewFooterProps {
  // How many entries the import writes.
  toWrite: number;
  // The last run, when some of it failed.
  lastRun: { written: number; total: number } | null;
  retryable: number;
  // The import running now.
  importing: boolean;
  progress: { done: number; total: number };
  loading: boolean;
  onImport: () => void;
  onRetry: () => void;
  onCancel: () => void;
}

// How long a big import takes, what a partly failed one did, and the
// buttons.
const ReviewFooter = ({
  toWrite,
  lastRun,
  retryable,
  importing,
  progress,
  loading,
  onImport,
  onRetry,
  onCancel
}: ReviewFooterProps) => {
  let importLabel: string;
  if (importing) {
    importLabel = `Importing ${countOf(progress.done, progress.total)}…`;
  } else if (toWrite) {
    importLabel = `Import ${plural(toWrite, 'parameter')}`;
  } else {
    importLabel = 'Nothing to import';
  }

  return (
    <>
      {toWrite >= SLOW_IMPORT_WRITES && !importing && (
        <Alert
          type="warning"
          showIcon
          title={`This import writes ${plural(toWrite, 'parameter')}, which takes ${importDuration(toWrite)}.`}
          description={`AWS limits writes to ${WRITES_PER_SECOND} per second for the whole account, and you can't leave this page until it finishes.`}
        />
      )}
      {lastRun && !importing && (
        <PartialFailureAlert
          verb="Imported"
          done={lastRun.written}
          total={lastRun.total}
          onRetry={onRetry}
          retryDisabled={!retryable || loading}
        />
      )}
      <Flex justify="flex-end" align="center" gap="small">
        {loading && !importing && (
          <Typography.Text type="secondary" className={styles.status}>
            {WAITING_FOR_PARAMETERS}
          </Typography.Text>
        )}
        <Button disabled={importing} onClick={onCancel}>
          Cancel
        </Button>
        <Button
          type="primary"
          loading={importing}
          disabled={!toWrite || loading}
          onClick={onImport}
        >
          {importLabel}
        </Button>
      </Flex>
    </>
  );
};

export default ReviewFooter;
