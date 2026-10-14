import React from 'react';
import { Typography } from 'antd';
import { useSelector } from 'react-redux';
import { selectors as parameterSelectors } from '../../ducks/parameters';
import TimeAgo from '../common/TimeAgo';

const SyncStatus = () => {
  const loading = useSelector(parameterSelectors.getIsAllParametersLoading);
  const error = useSelector(parameterSelectors.getFetchError);
  const hasData = useSelector(
    state => parameterSelectors.getNames(state).length > 0
  );
  const lastSynced = useSelector(
    parameterSelectors.getAllParametersLastUpdatedDate
  );

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
