import type { ReactNode } from 'react';
import { Form, Input } from 'antd';
import useDraft from './useDraft';

interface SettingInputProps {
  id: string;
  label: ReactNode;
  tooltip?: ReactNode;
  // The saved value.
  value: string;
  // An error message, or null when the value can be saved.
  validate: (value: string) => string | null;
  onSave: (value: string) => Promise<void>;
  maxLength?: number;
  className?: string;
}

// A text setting that keeps a draft while typing (see useDraft). The error
// shows under the field.
const SettingInput = ({
  id,
  label,
  tooltip,
  value,
  validate,
  onSave,
  maxLength,
  className
}: SettingInputProps) => {
  const { draft, error, saving, change, commit, onKeyDown } = useDraft({
    value,
    validate,
    onSave
  });

  return (
    <Form.Item
      label={label}
      htmlFor={id}
      tooltip={tooltip}
      validateStatus={error ? 'error' : undefined}
      help={error}
    >
      <Input
        id={id}
        value={draft}
        // A save in flight would replace a newer draft.
        readOnly={saving}
        maxLength={maxLength}
        className={className}
        onChange={event => change(event.target.value)}
        onPressEnter={commit}
        onKeyDown={onKeyDown}
        onBlur={commit}
      />
    </Form.Item>
  );
};

export default SettingInput;
