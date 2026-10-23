import { Tag, Tooltip, Typography } from 'antd';
import type { FormatId } from '../../state/export';
import { FORMATS, formatTag, isAvailable } from './formats';
import type { Format, Mode } from './formats';
import styles from './FormatCards.module.css';

interface FormatCardsProps {
  mode: Mode;
  value: FormatId;
  onChange: (id: FormatId) => void;
  disabled?: boolean;
  // Tests pass their own.
  formats?: Format[];
}

// Every format, as a group of radio cards. Formats the mode can't use are
// shown dimmed, not hidden, so it's clear which exist.
const FormatCards = ({
  mode,
  value,
  onChange,
  disabled = false,
  formats = FORMATS
}: FormatCardsProps) => (
  <div className={styles.grid} role="radiogroup" aria-label="Format">
    {formats.map(format => {
      const available = isAvailable(format, mode);
      const selected = format.id === value;
      const classes = [styles.card];
      if (selected) classes.push(styles.selected);
      if (!available) classes.push(styles.unavailable);
      const card = (
        <button
          key={format.id}
          type="button"
          role="radio"
          aria-label={`${format.label}: ${format.description}`}
          aria-checked={selected}
          aria-disabled={!available || disabled}
          className={classes.join(' ')}
          onClick={() => {
            if (available && !disabled) onChange(format.id);
          }}
        >
          <span className={styles.header}>
            <span className={styles.icon}>{format.icon}</span>
            <Typography.Text strong>{format.label}</Typography.Text>
            <Tag className={styles.tag}>{formatTag(format)}</Tag>
          </span>
          <Typography.Text type="secondary" className={styles.description}>
            {format.description}
          </Typography.Text>
        </button>
      );
      return available ? (
        card
      ) : (
        <Tooltip
          key={format.id}
          title={mode === 'import' ? "Can't be imported" : "Can't be exported"}
        >
          {card}
        </Tooltip>
      );
    })}
  </div>
);

export default FormatCards;
