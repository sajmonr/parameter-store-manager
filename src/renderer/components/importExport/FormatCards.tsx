import type { FormatId } from '../../state/export';
import { FORMATS, isAvailable } from './formats';
import type { Format, Mode } from './formats';
import OptionCards from './OptionCards';

interface FormatCardsProps {
  mode: Mode;
  value: FormatId;
  onChange: (id: FormatId) => void;
  disabled?: boolean;
  // Tests pass their own.
  formats?: Format[];
}

// Every format. Formats the mode can't use are shown dimmed, not hidden, so
// it's clear which exist.
const FormatCards = ({
  mode,
  value,
  onChange,
  disabled = false,
  formats = FORMATS
}: FormatCardsProps) => (
  <OptionCards
    label="Format"
    value={value}
    onChange={onChange}
    disabled={disabled}
    options={formats.map(format => ({
      value: format.id,
      label: format.label,
      icon: format.icon,
      description: format.description,
      unavailable: isAvailable(format, mode)
        ? undefined
        : mode === 'import'
          ? "Can't be imported"
          : "Can't be exported"
    }))}
  />
);

export default FormatCards;
