import { Button, Tooltip, Typography } from 'antd';
import { SyncOutlined } from '@ant-design/icons';
import { useParameters } from '../../state/parameters';
import TimeAgo from '../common/TimeAgo';

// When the parameters were last loaded. Clicking it loads them again.
const SyncStatus = () => {
  const {
    loading,
    fetchError: error,
    parameters,
    syncedAt: lastSynced,
    refresh
  } = useParameters();
  const hasData = parameters.length > 0;

  let content = null;
  if (loading) content = hasData ? 'Syncing…' : 'Loading parameters…';
  else if (error) content = 'Last sync failed';
  else if (lastSynced)
    content = (
      <>
        Synced <TimeAgo date={lastSynced} />
      </>
    );

  return (
    <Tooltip title={loading ? null : 'Refresh'}>
      <Button
        type="text"
        size="small"
        icon={<SyncOutlined spin={loading} />}
        disabled={loading}
        onClick={refresh}
      >
        <Typography.Text
          type={!loading && error ? 'danger' : 'secondary'}
          style={{ fontSize: 12, whiteSpace: 'nowrap' }}
        >
          {content}
        </Typography.Text>
      </Button>
    </Tooltip>
  );
};

export default SyncStatus;
