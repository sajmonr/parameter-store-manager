import React from 'react';
import { Button, Tooltip, Typography } from 'antd';
import { CloudOutlined } from '@ant-design/icons';
import { useDispatch, useSelector } from 'react-redux';
import { selectors as settingsSelectors } from '../../ducks/settings';
import { actions as uiActions } from '../../ducks/ui';

// The AWS profile and region in use; opens Settings to change them.
const ProfileChip = () => {
  const dispatch = useDispatch();
  const profile = useSelector(settingsSelectors.getProfile);
  const region = useSelector(settingsSelectors.getSsmRegion);

  return (
    <Tooltip title="AWS profile and region">
      <Button
        icon={<CloudOutlined />}
        onClick={() => dispatch(uiActions.openSettings())}
        style={{ flex: 'none' }}
      >
        <Typography.Text strong>{profile || 'default'}</Typography.Text>
        <Typography.Text type="secondary">{region}</Typography.Text>
      </Button>
    </Tooltip>
  );
};

export default ProfileChip;
