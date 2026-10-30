import type { FormatId } from '../../../shared/fileFormats';
import { FORMATS, isAvailable } from '../../utils/formats';
import { FORMAT_ICONS } from './formatIcons';
import type { Format, Mode } from '../../utils/formats';
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
      icon: FORMAT_ICONS[format.id],
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
