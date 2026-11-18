import { Flex } from 'antd';
import type { ParameterEntry } from '../../state/parameters';
import MaskedValue from '../common/MaskedValue';
import RevealButton from '../common/RevealButton';
import CopyButton from '../common/CopyButton';
import { isSecure } from '../../../shared/parameterTypes';

interface ValueCellProps {
  parameter: ParameterEntry;
  revealed: boolean;
  onToggleReveal: () => void;
}

const ValueCell = ({ parameter, revealed, onToggleReveal }: ValueCellProps) => {
  const secure = isSecure(parameter);
  return (
    <Flex align="center" gap="var(--ant-margin-xxs)">
      <MaskedValue
        value={parameter.Value}
        secure={secure}
        revealed={revealed}
        size="small"
        ellipsis
        style={{ minWidth: 0, marginRight: 4 }}
      />
      {secure && <RevealButton revealed={revealed} onToggle={onToggleReveal} />}
      <CopyButton text={parameter.Value} />
    </Flex>
  );
};

export default ValueCell;
