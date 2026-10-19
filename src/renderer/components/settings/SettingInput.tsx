import { useState } from 'react';
import type { ReactNode } from 'react';
import { Form, Input } from 'antd';
import useEscape from '../../hooks/useEscape';

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

// A text setting that keeps a draft while typing. Enter or leaving the field
// saves the draft when it is valid; until then the saved value stays in
// effect and the error shows under the field. Esc puts the saved value back.
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
  const [draft, setDraft] = useState(value);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [savedValue, setSavedValue] = useState(value);

  // A newly saved value, from here or elsewhere, replaces the draft.
  if (value !== savedValue) {
    setSavedValue(value);
    setDraft(value);
    setError(null);
  }

  const revert = () => {
    setDraft(value);
    setError(null);
  };

  useEscape(revert, draft !== value || !!error);

  const commit = () => {
    if (saving) return;
    if (draft === value) {
      setError(null);
      return;
    }
    const invalid = validate(draft);
    if (invalid) {
      setError(invalid);
      return;
    }
    setSaving(true);
    onSave(draft)
      .catch((saveError: Error) => setError(saveError.message))
      .finally(() => setSaving(false));
  };

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
        onChange={event => {
          setDraft(event.target.value);
          setError(null);
        }}
        onPressEnter={commit}
        onBlur={commit}
      />
    </Form.Item>
  );
};

export default SettingInput;
