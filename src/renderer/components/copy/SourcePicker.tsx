import { Select, Flex } from 'antd';
import { isEditableType } from '../../../shared/parameterTypes';
import type { SourceEnvironment } from '../../utils/copyValue';
import { cx } from '../../utils/classNames';
import EnvironmentDot from '../common/EnvironmentDot';
import styles from './CopyModal.module.css';
import HintText from '../common/HintText';

interface SourcePickerProps {
  options: SourceEnvironment[];
  value: string;
  onChange: (name: string) => void;
  // Asks the user to check the source.
  highlight: boolean;
  disabled: boolean;
}

// The source environment, when more than one has the key.
const SourcePicker = ({
  options,
  value,
  onChange,
  highlight,
  disabled
}: SourcePickerProps) => {
  const color = options.find(o => o.name === value)?.color;
  return (
    <Select
      value={value}
      onChange={onChange}
      disabled={disabled}
      aria-label="Source environment"
      prefix={color && <EnvironmentDot color={color} />}
      popupMatchSelectWidth={false}
      className={cx(styles.sourcePicker, highlight && styles.highlight)}
      options={options.map(({ segment, color: dot, name, type }) => ({
        value: name,
        label: segment,
        dot,
        unsupported: isEditableType(type) ? null : type,
        disabled: !isEditableType(type)
      }))}
      optionRender={({ data }) => (
        <Flex
          component="span"
          align="center"
          gap="small"
          className={styles.sourceOption}
        >
          <EnvironmentDot color={data.dot} />
          {data.label}
          {data.unsupported && (
            <HintText>{data.unsupported} not supported</HintText>
          )}
        </Flex>
      )}
    />
  );
};

export default SourcePicker;
