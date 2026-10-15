import React from 'react';
import { Button, Tooltip, Typography } from 'antd';
import { CloudOutlined } from '@ant-design/icons';
import { useSettingsStore } from '../../state/settings';
import { uiActions } from '../../state/ui';

// The AWS profile and region in use; opens Settings to change them.
const ProfileChip = () => {
  const profile = useSettingsStore(settings => settings.profile);
  const region = useSettingsStore(settings => settings.ssmRegion);

  return (
    <Tooltip title="AWS profile and region">
      <Button
        icon={<CloudOutlined />}
        onClick={uiActions.openSettings}
        style={{ flex: 'none' }}
      >
        <Typography.Text strong>{profile || 'default'}</Typography.Text>
        <Typography.Text type="secondary">{region}</Typography.Text>
      </Button>
    </Tooltip>
  );
};

export default ProfileChip;
