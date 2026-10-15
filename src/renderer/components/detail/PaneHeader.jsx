import React from 'react';
import PropTypes from 'prop-types';
import { Button, Flex } from 'antd';
import { CloseOutlined } from '@ant-design/icons';
import { uiActions } from '../../state/ui';

// The title row of the pane, with a close button on the right.
const PaneHeader = ({ children }) => (
  <Flex align="flex-start" justify="space-between" gap={8}>
    <div style={{ minWidth: 0 }}>{children}</div>
    <Button
      type="text"
      size="small"
      icon={<CloseOutlined />}
      aria-label="Close"
      onClick={uiActions.closePane}
    />
  </Flex>
);

PaneHeader.propTypes = {
  children: PropTypes.node.isRequired
};

export default PaneHeader;
