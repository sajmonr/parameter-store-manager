import { Input, Typography } from 'antd';
import useDraft from './useDraft';
import styles from './Settings.module.css';

interface SegmentInputProps {
  label: string;
  // The saved segment; '' for a row that isn't saved yet.
  value: string;
  validate: (value: string) => string | null;
  onSave: (value: string) => Promise<unknown>;
  // For a row that isn't saved yet: Esc, or leaving the row with it
  // empty, drops it.
  onCancel?: () => void;
  autoFocus?: boolean;
}

// A path segment in a table row, saved like any text setting (see useDraft).
// The error shows under the field.
const SegmentInput = ({
  label,
  value,
  validate,
  onSave,
  onCancel,
  autoFocus
}: SegmentInputProps) => {
  const { draft, error, saving, change, commit } = useDraft({
    value,
    validate,
    onSave,
    onCancel
  });

  return (
    <>
      <Input
        aria-label={label}
        aria-invalid={!!error}
        value={draft}
        status={error ? 'error' : undefined}
        // A save in flight would replace a newer draft.
        readOnly={saving}
        autoFocus={autoFocus}
        className={styles.mono}
        onChange={event => change(event.target.value)}
        onPressEnter={commit}
        onBlur={event => {
          if (!onCancel || draft) {
            commit();
            return;
          }
          // Picking the new row's colour keeps it.
          const row = event.currentTarget.closest('tr');
          if (!row?.contains(event.relatedTarget)) onCancel();
        }}
      />
      {error && (
        <Typography.Text type="danger" className={styles.fieldError}>
          {error}
        </Typography.Text>
      )}
    </>
  );
};

export default SegmentInput;
