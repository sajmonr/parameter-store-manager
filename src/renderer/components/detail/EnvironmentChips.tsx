import type { KeyboardEvent } from 'react';
import { Tag, Tooltip } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { useParameters } from '../../state/parameters';
import type { ParameterEntry } from '../../state/parameters';
import { uiActions } from '../../state/ui';
import type { EnvironmentState } from '../../state/views';
import EnvironmentDot from '../common/EnvironmentDot';
import SetMissingMenu from '../setMissing/SetMissingMenu';
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

interface EnvironmentChipsProps {
  chips: EnvironmentChip[];
  // The parameter open in the pane, and its service and key.
  parameter: ParameterEntry;
  service: string;
  parameterKey: string;
}

// One chip per environment the service is in: the parameter's own, filled;
// the others where its key exists, which open it; and the ones where it's
// missing, whose menu sets it there.
const EnvironmentChips = ({
  chips,
  parameter,
  service,
  parameterKey
}: EnvironmentChipsProps) => {
  const { byName } = useParameters();
  const sources = chips.flatMap(chip =>
    chip.state === 'missing'
      ? []
      : [{ ...chip, type: byName.get(chip.name)?.Type }]
  );
  const current = sources.find(chip => chip.state === 'current')!;

  return (
    <div className={styles.chips}>
      {chips.map(({ segment, color, name, state }) => {
        if (state === 'current') {
          return (
            <Tag
              key={segment}
              color={color}
              variant="solid"
              aria-current="true"
            >
              {segment}
            </Tag>
          );
        }
        if (state === 'missing') {
          return (
            <SetMissingMenu
              key={segment}
              service={service}
              parameterKey={parameterKey}
              target={{ segment, color }}
              sources={sources}
              current={current}
              template={parameter}
            >
              {open => (
                <Tag
                  variant="outlined"
                  className={
                    open ? `${styles.missing} ${styles.active}` : styles.missing
                  }
                  role="button"
                  tabIndex={0}
                  onClick={event => event.stopPropagation()}
                  onKeyDown={event =>
                    onActivate(() => event.currentTarget.click())(event)
                  }
                >
                  <EnvironmentDot color={color} />
                  {segment} · missing
                  <PlusOutlined className={styles.add} />
                </Tag>
              )}
            </SetMissingMenu>
          );
        }
        const open = () => uiActions.showInEnvironment(name);
        return (
          <Tooltip key={segment} title={`Open in ${segment}`}>
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
      })}
    </div>
  );
};

export default EnvironmentChips;
