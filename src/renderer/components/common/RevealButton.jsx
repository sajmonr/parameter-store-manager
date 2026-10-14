import React from 'react';
import PropTypes from 'prop-types';
import { Button, Tooltip } from 'antd';
import { EyeInvisibleOutlined, EyeOutlined } from '@ant-design/icons';

// Shows or hides a SecureString value. With `withLabel` the button says
// Reveal/Hide, otherwise it is an icon button with a tooltip.
const RevealButton = ({ revealed, onToggle, withLabel }) => {
  const text = revealed ? 'Hide' : 'Reveal';
  const onClick = event => {
    event.stopPropagation();
    onToggle();
  };
  const button = (
    <Button
      type="text"
      size="small"
      icon={revealed ? <EyeInvisibleOutlined /> : <EyeOutlined />}
      onClick={onClick}
      aria-label={withLabel ? undefined : text}
    >
      {withLabel && text}
    </Button>
  );
  return withLabel ? button : <Tooltip title={text}>{button}</Tooltip>;
};

RevealButton.propTypes = {
  onToggle: PropTypes.func.isRequired,
  revealed: PropTypes.bool,
  withLabel: PropTypes.bool
};

export default RevealButton;
