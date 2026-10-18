import { Typography } from 'antd';
import { useParameters } from '../../state/parameters';
import TimeAgo from '../common/TimeAgo';

// When the parameters were last loaded. Nothing during the first load: the
// count next to it already says it's loading.
const SyncStatus = () => {
  const {
    loading,
    fetchError: error,
    parameters,
    syncedAt: lastSynced
  } = useParameters();
  const hasData = parameters.length > 0;

  let content = null;
  if (loading) content = hasData ? 'Syncing…' : null;
  else if (error) content = 'Last sync failed';
  else if (lastSynced)
    content = (
      <>
        Synced <TimeAgo date={lastSynced} />
      </>
    );
  if (!content) return null;

  return (
    <Typography.Text
      type={!loading && error ? 'danger' : 'secondary'}
      style={{ fontSize: 12, whiteSpace: 'nowrap' }}
    >
      {content}
    </Typography.Text>
  );
};

export default SyncStatus;
