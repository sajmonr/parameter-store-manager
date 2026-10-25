import { useEffect, useId, useRef, useState } from 'react';
import type { KeyboardEvent } from 'react';
import { Input, Tooltip } from 'antd';
import { FolderOutlined } from '@ant-design/icons';
import type { Suggestion } from '../../utils/newParameter';
import styles from './NameField.module.css';

interface NameFieldProps {
  value: string;
  onChange: (value: string) => void;
  // The existing folders that complete the value as typed.
  suggestions: Suggestion[];
  error: boolean;
  onFocusChange: (focused: boolean) => void;
  placeholder?: string;
  'aria-label': string;
}

const stripNewlines = (text: string) => text.replace(/[\r\n]+/g, '');

// The key or path of a new parameter: wraps instead of scrolling, and offers
// the existing folders at the level being typed. Completing one offers the
// next level, so the user can drill down without leaving the keyboard.
const NameField = ({
  value,
  onChange,
  suggestions,
  error,
  onFocusChange,
  placeholder,
  'aria-label': ariaLabel
}: NameFieldProps) => {
  const listId = useId();
  const [focused, setFocused] = useState(false);
  // Esc hides the list until the next keystroke.
  const [dismissed, setDismissed] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);
  const focusedBefore = useRef(false);
  const open = focused && !dismissed && suggestions.length > 0;
  const active = Math.min(highlight, suggestions.length - 1);

  useEffect(() => {
    listRef.current
      ?.querySelector('[aria-selected="true"]')
      ?.scrollIntoView?.({ block: 'nearest' });
  }, [active, open]);

  const change = (next: string) => {
    setDismissed(false);
    setHighlight(0);
    onChange(next);
  };

  const complete = (suggestion: Suggestion) =>
    change(suggestion.parent + suggestion.child);

  const move = (step: number) =>
    setHighlight((active + step + suggestions.length) % suggestions.length);

  const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter') {
      // The value is one line; ⌘↵ still reaches the form.
      event.preventDefault();
      if (open && !event.metaKey && !event.ctrlKey) {
        complete(suggestions[active]!);
      }
      return;
    }
    if (!open) return;
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      move(event.key === 'ArrowDown' ? 1 : -1);
    } else if (event.key === 'Tab' && !event.shiftKey) {
      event.preventDefault();
      complete(suggestions[active]!);
    } else if (event.key === 'Escape') {
      // Only the list closes, not the pane.
      event.preventDefault();
      event.stopPropagation();
      setDismissed(true);
    }
  };

  const setFocus = (next: boolean) => {
    setFocused(next);
    onFocusChange(next);
  };

  const optionId = (index: number) => `${listId}-${index}`;

  return (
    <div className={styles.field}>
      <Input.TextArea
        className={styles.input}
        style={{ resize: 'none' }}
        value={value}
        onChange={event => change(stripNewlines(event.target.value))}
        onKeyDown={onKeyDown}
        onFocus={event => {
          // It starts with the folder filled in: type after it.
          if (!focusedBefore.current) {
            const { length } = event.target.value;
            event.target.setSelectionRange(length, length);
            focusedBefore.current = true;
          }
          setFocus(true);
        }}
        onBlur={() => setFocus(false)}
        rows={2}
        placeholder={placeholder}
        status={error ? 'error' : undefined}
        spellCheck={false}
        aria-label={ariaLabel}
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        aria-activedescendant={open ? optionId(active) : undefined}
      />
      {open && (
        <div className={styles.popup}>
          <div
            ref={listRef}
            id={listId}
            role="listbox"
            aria-label="Folders"
            className={styles.list}
          >
            {suggestions.map((suggestion, index) => (
              <Tooltip
                key={suggestion.child}
                title={suggestion.parent + suggestion.child}
                placement="left"
                mouseEnterDelay={0.6}
              >
                <div
                  id={optionId(index)}
                  role="option"
                  aria-selected={index === active}
                  className={styles.option}
                  onMouseEnter={() => setHighlight(index)}
                  onMouseDown={event => {
                    // Keeps the focus in the field.
                    event.preventDefault();
                    complete(suggestion);
                  }}
                >
                  <FolderOutlined className={styles.icon} />
                  <span className={styles.text}>
                    <span className={styles.parent}>{suggestion.parent}</span>
                    {suggestion.child}
                  </span>
                </div>
              </Tooltip>
            ))}
          </div>
          <div className={styles.footer}>
            ↑↓ to move · Tab or ↵ to complete · Esc to close
          </div>
        </div>
      )}
    </div>
  );
};

export default NameField;
