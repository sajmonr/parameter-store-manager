import React from 'react';
import PropTypes from 'prop-types';
import { Button, Flex } from 'antd';
import { CloseOutlined } from '@ant-design/icons';
import { useDispatch } from 'react-redux';
import { actions as uiActions } from '../../ducks/ui';

// The title row of the pane, with a close button on the right.
const PaneHeader = ({ children }) => {
  const dispatch = useDispatch();
  return (
    <Flex align="flex-start" justify="space-between" gap={8}>
      <div style={{ minWidth: 0 }}>{children}</div>
      <Button
        type="text"
        size="small"
        icon={<CloseOutlined />}
        aria-label="Close"
        onClick={() => dispatch(uiActions.closePane())}
      />
    </Flex>
  );
};

PaneHeader.propTypes = {
  children: PropTypes.node.isRequired
};

export default PaneHeader;
