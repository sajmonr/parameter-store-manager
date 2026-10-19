import { forwardRef, useState } from 'react';
import { Button, ColorPicker } from 'antd';
import type { ButtonProps } from 'antd';
import { ENVIRONMENT_COLORS } from '../../../shared/structure';
import styles from './Settings.module.css';

export const EnvironmentDot = ({ color }: { color: string }) => (
  <span className={styles.dot} style={{ background: color }} aria-hidden />
);

// The picker opens from the swatch it wraps, so the swatch takes the props
// and ref it is given.
const Swatch = forwardRef<
  HTMLButtonElement,
  { color: string; label: string } & Omit<ButtonProps, 'color'>
>(({ color, label, ...props }, ref) => (
  <Button
    {...props}
    ref={ref}
    size="small"
    aria-label={`${label} color: ${color}`}
    className={styles.swatch}
    style={{ borderColor: color }}
    icon={<EnvironmentDot color={color} />}
  />
));
Swatch.displayName = 'Swatch';

const presets = [
  { label: 'Suggested', colors: [...ENVIRONMENT_COLORS], defaultOpen: true }
];

// Shows an environment's colour; a click opens a full colour picker. The
// colour is saved once a drag ends or a value is entered, not while dragging.
// A failed save shows the saved colour again. Without `onChange` (a row that
// isn't saved yet), it only shows the colour.
export const EnvironmentColorPicker = ({
  color,
  label,
  onChange
}: {
  color: string;
  label: string;
  // Resolves to whether the colour was saved.
  onChange?: (color: string) => Promise<boolean>;
}) => {
  const [draft, setDraft] = useState(color);
  const [savedColor, setSavedColor] = useState(color);

  // A newly saved colour, from here or elsewhere, replaces the draft.
  if (color !== savedColor) {
    setSavedColor(color);
    setDraft(color);
  }

  if (!onChange) return <Swatch color={color} label={label} disabled />;

  return (
    <ColorPicker
      value={draft}
      format="hex"
      disabledAlpha
      disabledFormat
      presets={presets}
      onChange={value => setDraft(value.toHexString())}
      onChangeComplete={value => {
        const hex = value.toHexString();
        if (hex === color.toLowerCase()) return;
        void onChange(hex).then(saved => {
          // Unless another colour was picked since.
          if (!saved) setDraft(current => (current === hex ? color : current));
        });
      }}
    >
      <Swatch color={draft} label={label} />
    </ColorPicker>
  );
};
