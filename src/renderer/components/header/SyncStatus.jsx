import React from 'react';
import { Typography } from 'antd';
import { useParameters } from '../../state/parameters';
import TimeAgo from '../common/TimeAgo';

const SyncStatus = () => {
  const {
    loading,
    fetchError: error,
    parameters,
    syncedAt: lastSynced
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
    <Typography.Text
      type={!loading && error ? 'danger' : 'secondary'}
      style={{ fontSize: 12, whiteSpace: 'nowrap' }}
    >
      {content}
    </Typography.Text>
  );
};

export default SyncStatus;
