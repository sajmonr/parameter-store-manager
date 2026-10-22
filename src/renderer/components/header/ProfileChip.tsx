import { Button, Tag, Tooltip, Typography } from 'antd';
import { CloudOutlined } from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { sourceService } from '../../services';
import { useSettingsStore } from '../../state/settings';
import { uiActions } from '../../state/ui';

// The AWS profile and region in use; opens Settings to change them. With
// the fake development dataset, a FAKE tag says nothing reaches AWS.
const ProfileChip = () => {
  const profile = useSettingsStore(settings => settings.profile);
  const region = useSettingsStore(settings => settings.ssmRegion);
  // Fixed for the life of the app.
  const { data: source } = useQuery({
    queryKey: ['source'],
    queryFn: sourceService.get,
    staleTime: Infinity
  });
  const fake = source === 'fake';

  return (
    <Tooltip
      title={
        fake
          ? 'Fake development data: nothing reaches AWS. Start with npm run dev:aws for real data.'
          : 'AWS profile and region'
      }
    >
      <Button
        icon={<CloudOutlined />}
        onClick={() => uiActions.openSettings('aws')}
        style={{ flex: 'none' }}
      >
        <Typography.Text strong>{profile || 'default'}</Typography.Text>
        <Typography.Text type="secondary">{region}</Typography.Text>
        {fake && (
          <Tag color="magenta" variant="solid" style={{ marginInlineEnd: 0 }}>
            FAKE
          </Tag>
        )}
      </Button>
    </Tooltip>
  );
};

export default ProfileChip;
