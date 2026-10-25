import type { ReactNode } from 'react';
import { Tooltip, Typography } from 'antd';
import styles from './OptionCards.module.css';

export interface CardOption<T extends string> {
  value: T;
  label: string;
  icon: ReactNode;
  description: string;
  // Why it can't be picked; the card is then shown dimmed, not hidden.
  unavailable?: string;
}

interface OptionCardsProps<T extends string> {
  label: string;
  options: CardOption<T>[];
  value: T;
  onChange: (value: T) => void;
  disabled?: boolean;
  // Splits the full width between the cards, instead of 220px+ columns.
  fill?: boolean;
}

// A choice shown as a group of radio cards, each with an icon, a name and a
// line of description.
const OptionCards = <T extends string>({
  label,
  options,
  value,
  onChange,
  disabled = false,
  fill = false
}: OptionCardsProps<T>) => (
  <div
    className={styles.grid}
    style={
      fill
        ? { gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }
        : undefined
    }
    role="radiogroup"
    aria-label={label}
  >
    {options.map(option => {
      const selected = option.value === value;
      const classes = [styles.card];
      if (selected) classes.push(styles.selected);
      if (option.unavailable) classes.push(styles.unavailable);
      const card = (
        <button
          key={option.value}
          type="button"
          role="radio"
          aria-label={`${option.label}: ${option.description}`}
          aria-checked={selected}
          aria-disabled={!!option.unavailable || disabled}
          className={classes.join(' ')}
          onClick={() => {
            if (!option.unavailable && !disabled) onChange(option.value);
          }}
        >
          <span className={styles.header}>
            <span className={styles.icon}>{option.icon}</span>
            <Typography.Text strong>{option.label}</Typography.Text>
          </span>
          <Typography.Text type="secondary" className={styles.description}>
            {option.description}
          </Typography.Text>
        </button>
      );
      return option.unavailable ? (
        <Tooltip key={option.value} title={option.unavailable}>
          {card}
        </Tooltip>
      ) : (
        card
      );
    })}
  </div>
);

export default OptionCards;
