import { useState } from 'react';
import { Button, Flex, Popover, theme } from 'antd';
import { ENVIRONMENT_COLORS } from '../../../shared/structure';
import type { EnvironmentColor } from '../../../shared/structure';
import styles from './Settings.module.css';

// An antd preset colour, as the theme draws it.
export const useEnvironmentColor = (color: EnvironmentColor) =>
  theme.useToken().token[color];

export const EnvironmentDot = ({ color }: { color: EnvironmentColor }) => (
  <span
    className={styles.dot}
    style={{ background: useEnvironmentColor(color) }}
    aria-hidden
  />
);

const Swatch = ({
  color,
  label,
  selected,
  onClick
}: {
  color: EnvironmentColor;
  label: string;
  selected?: boolean;
  onClick?: () => void;
}) => (
  <Button
    size="small"
    aria-label={label}
    aria-pressed={selected}
    className={styles.swatch}
    style={{ borderColor: useEnvironmentColor(color) }}
    icon={<EnvironmentDot color={color} />}
    onClick={onClick}
  />
);

// Shows an environment's colour; a click opens the presets to pick from.
export const ColorPicker = ({
  color,
  label,
  onChange
}: {
  color: EnvironmentColor;
  label: string;
  onChange: (color: EnvironmentColor) => void;
}) => {
  const [open, setOpen] = useState(false);
  return (
    <Popover
      open={open}
      onOpenChange={setOpen}
      trigger="click"
      placement="bottomLeft"
      content={
        <Flex gap={6} role="group" aria-label={`${label} colors`}>
          {ENVIRONMENT_COLORS.map(preset => (
            <Swatch
              key={preset}
              color={preset}
              label={preset}
              selected={preset === color}
              onClick={() => {
                setOpen(false);
                if (preset !== color) onChange(preset);
              }}
            />
          ))}
        </Flex>
      }
    >
      <span>
        <Swatch color={color} label={`${label}: ${color}. Change color`} />
      </span>
    </Popover>
  );
};
