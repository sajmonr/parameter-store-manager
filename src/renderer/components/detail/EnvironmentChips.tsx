import type { KeyboardEvent } from 'react';
import { Tag, Tooltip } from 'antd';
import { uiActions } from '../../state/ui';
import type { EnvironmentState } from '../../state/views';
import EnvironmentDot from '../common/EnvironmentDot';
import styles from './EnvironmentChips.module.css';

export interface EnvironmentChip {
  segment: string;
  color: string;
  // The parameter with the key in this environment.
  name: string;
  state: EnvironmentState;
}

const onActivate = (open: () => void) => (event: KeyboardEvent) => {
  if (event.key !== 'Enter' && event.key !== ' ') return;
  event.preventDefault();
  open();
};

const Chip = ({ segment, color, name, state }: EnvironmentChip) => {
  if (state === 'current') {
    return (
      <Tag color={color} variant="solid" aria-current="true">
        {segment}
      </Tag>
    );
  }
  if (state === 'missing') {
    return (
      <Tooltip title={`Not set in ${segment}`}>
        <Tag variant="outlined" className={styles.missing}>
          <EnvironmentDot color={color} />
          {segment} · missing
        </Tag>
      </Tooltip>
    );
  }
  const open = () => uiActions.showInEnvironment(name);
  return (
    <Tooltip title={`Open in ${segment}`}>
      <Tag
        variant="outlined"
        className={styles.open}
        role="button"
        tabIndex={0}
        onClick={open}
        onKeyDown={onActivate(open)}
      >
        <EnvironmentDot color={color} />
        {segment}
      </Tag>
    </Tooltip>
  );
};

// One chip per environment the service is in: the parameter's own, filled;
// the others where its key exists, which open it; and the ones where it's
// missing, which do nothing yet.
const EnvironmentChips = ({ chips }: { chips: EnvironmentChip[] }) => (
  <div className={styles.chips}>
    {chips.map(chip => (
      <Chip key={chip.segment} {...chip} />
    ))}
  </div>
);

export default EnvironmentChips;
