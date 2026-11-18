import { Checkbox, Flex } from 'antd';
import type { StructureEnvironment } from '../../../shared/structure';
import EnvironmentDot from '../common/EnvironmentDot';
import styles from './EnvironmentPicker.module.css';
import { cx } from '../../utils/classNames';

interface EnvironmentPickerProps {
  environments: StructureEnvironment[];
  value: string[];
  onChange: (value: string[]) => void;
}

// One checkable chip per environment of the service. `onChange` gets the
// selection in the given order.
const EnvironmentPicker = ({
  environments,
  value,
  onChange
}: EnvironmentPickerProps) => {
  const toggle = (segment: string, checked: boolean) =>
    onChange(
      environments
        .map(env => env.segment)
        .filter(env => (env === segment ? checked : value.includes(env)))
    );

  return (
    <Flex gap="small" wrap role="group" aria-label="Environments">
      {environments.map(({ segment, color }) => {
        const checked = value.includes(segment);
        return (
          <Flex
            component="label"
            align="center"
            gap="small"
            key={segment}
            className={cx(styles.chip, checked && styles.checked)}
          >
            <Checkbox
              checked={checked}
              onChange={event => toggle(segment, event.target.checked)}
            />
            <EnvironmentDot color={color} />
            {segment}
          </Flex>
        );
      })}
    </Flex>
  );
};

export default EnvironmentPicker;
