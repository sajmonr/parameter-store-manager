import { useState } from 'react';
import type { KeyboardEvent } from 'react';

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
// value stays in effect and the error is returned. Esc in the field puts the
// saved value back; it is handled there, not with useEscape, so it only
// affects the field it is pressed in.
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

  const onKeyDown = (event: KeyboardEvent) => {
    if (event.key !== 'Escape') return;
    if (!onCancel && draft === value && !error) return;
    // Nothing else, such as the detail pane, reacts to this Esc.
    event.preventDefault();
    event.stopPropagation();
    (onCancel ?? revert)();
  };

  return { draft, error, saving, change, commit, onKeyDown };
};

export default useDraft;
