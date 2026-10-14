import React from 'react';
import PropTypes from 'prop-types';
import { Button, Tooltip } from 'antd';
import { CopyOutlined } from '@ant-design/icons';
import useCopy from '../../hooks/useCopy';

// Copies `text`. Without a label it is an icon button with a tooltip. Clicks
// don't reach the parent, so copying in a table row doesn't select the row.
const CopyButton = ({ text, label, disabled }) => {
  const copy = useCopy();
  const onClick = event => {
    event.stopPropagation();
    copy(text);
  };
  const button = (
    <Button
      type="text"
      size="small"
      icon={<CopyOutlined />}
      onClick={onClick}
      disabled={disabled || text === undefined}
      aria-label={label ? undefined : 'Copy'}
    >
      {label}
    </Button>
  );
  return label ? button : <Tooltip title="Copy">{button}</Tooltip>;
};

CopyButton.propTypes = {
  disabled: PropTypes.bool,
  label: PropTypes.node,
  text: PropTypes.string
};

export default CopyButton;
