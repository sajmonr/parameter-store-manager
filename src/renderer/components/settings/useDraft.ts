import { useState } from 'react';
import useEscape from '../../hooks/useEscape';

interface DraftOptions {
  // The saved value.
  value: string;
  // An error message, or null when the value can be saved.
  validate: (value: string) => string | null;
  onSave: (value: string) => Promise<unknown>;
  // Instead of reverting, Esc calls this when given.
  onCancel?: () => void;
}

// A text setting that keeps a draft while typing. Committing (Enter or
// leaving the field) saves the draft when it is valid; until then the saved
// value stays in effect and the error is returned. Esc puts the saved value
// back.
const useDraft = ({ value, validate, onSave, onCancel }: DraftOptions) => {
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

  useEscape(onCancel ?? revert, !!onCancel || draft !== value || !!error);

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

  const change = (next: string) => {
    setDraft(next);
    setError(null);
  };

  return { draft, error, saving, change, commit };
};

export default useDraft;
