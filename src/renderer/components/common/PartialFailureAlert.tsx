import type { ReactNode } from 'react';
import { Alert, Button } from 'antd';
import { countOf } from '../../utils/progress';

// "Created 3 of 5. 2 failed."
export const partialFailureText = (verb: string, done: number, total: number) =>
  `${verb} ${countOf(done, total)}. ${(total - done).toLocaleString()} failed.`;

interface PartialFailureAlertProps {
  // What was done: 'Created', 'Imported', 'Copied to'.
  verb: string;
  done: number;
  total: number;
  // Shows a retry button.
  onRetry?: () => void;
  retryLabel?: ReactNode;
  retryDisabled?: boolean;
  className?: string;
}

// After a batch where some items failed: how many went through, and a way
// to retry the rest.
const PartialFailureAlert = ({
  verb,
  done,
  total,
  onRetry,
  retryLabel = 'Retry failed',
  retryDisabled = false,
  className
}: PartialFailureAlertProps) => (
  <Alert
    type="error"
    showIcon
    className={className}
    title={partialFailureText(verb, done, total)}
    action={
      onRetry && (
        <Button size="small" disabled={retryDisabled} onClick={onRetry}>
          {retryLabel}
        </Button>
      )
    }
  />
);

export default PartialFailureAlert;
