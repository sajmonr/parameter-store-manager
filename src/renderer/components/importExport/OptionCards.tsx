import type { ReactNode } from 'react';
import { Tooltip, Typography, Flex } from 'antd';
import styles from './OptionCards.module.css';
import { cx } from '../../utils/classNames';
import { OPTION_CARD_MIN_WIDTH } from '../../utils/layout';

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
  // Splits the full width between the cards, instead of wrapping them
  // at OPTION_CARD_MIN_WIDTH.
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
  <Flex wrap gap="var(--ant-margin-sm)" role="radiogroup" aria-label={label}>
    {options.map(option => {
      const selected = option.value === value;
      const card = (
        <button
          key={option.value}
          type="button"
          style={{
            flex: fill ? '1 1 0' : `1 1 ${OPTION_CARD_MIN_WIDTH}px`
          }}
          role="radio"
          aria-label={`${option.label}: ${option.description}`}
          aria-checked={selected}
          aria-disabled={!!option.unavailable || disabled}
          className={cx(
            styles.card,
            selected && styles.selected,
            option.unavailable && styles.unavailable
          )}
          onClick={() => {
            if (!option.unavailable && !disabled) onChange(option.value);
          }}
        >
          <Flex component="span" vertical gap="small">
            <Flex component="span" align="center" gap="small">
              <span className={styles.icon}>{option.icon}</span>
              <Typography.Text strong>{option.label}</Typography.Text>
            </Flex>
            <Typography.Text type="secondary" className={styles.description}>
              {option.description}
            </Typography.Text>
          </Flex>
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
  </Flex>
);

export default OptionCards;
