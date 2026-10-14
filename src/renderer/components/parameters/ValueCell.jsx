import React from 'react';
import PropTypes from 'prop-types';
import { Flex } from 'antd';
import MaskedValue from '../common/MaskedValue';
import RevealButton from '../common/RevealButton';
import CopyButton from '../common/CopyButton';

const ValueCell = ({ parameter, revealed, onToggleReveal }) => {
  const secure = parameter.Type === 'SecureString';
  return (
    <Flex align="center" gap={2}>
      <MaskedValue
        value={parameter.Value}
        secure={secure}
        revealed={revealed}
        size={13}
        ellipsis
        style={{ minWidth: 0, marginRight: 4 }}
      />
      {secure && <RevealButton revealed={revealed} onToggle={onToggleReveal} />}
      <CopyButton text={parameter.Value} />
    </Flex>
  );
};

ValueCell.propTypes = {
  onToggleReveal: PropTypes.func.isRequired,
  parameter: PropTypes.shape({
    Type: PropTypes.string,
    Value: PropTypes.string
  }).isRequired,
  revealed: PropTypes.bool
};

export default ValueCell;
