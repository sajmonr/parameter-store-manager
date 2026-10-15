import React from 'react';
import { useParameters } from '../../state/parameters';
import { useMatcher, useVisibleParameters } from '../../state/views';
import ParameterBreadcrumb from './ParameterBreadcrumb';
import ParameterTable from './ParameterTable';
import StatusBar from './StatusBar';
import TableSkeleton from '../states/TableSkeleton';
import NoResults from '../states/NoResults';
import EmptyFolder from '../states/EmptyFolder';
import EmptyAccount from '../states/EmptyAccount';
import ConnectionError from '../states/ConnectionError';

const renderContent = (loadState, visible, query) => {
  switch (loadState) {
    case 'loading':
      return <TableSkeleton />;
    case 'empty':
      return <EmptyAccount />;
    case 'ready':
      break;
    default:
      return <ConnectionError kind={loadState} />;
  }

  let table = <ParameterTable parameters={visible} />;
  if (!visible.length) table = query ? <NoResults /> : <EmptyFolder />;
  return (
    <>
      <ParameterBreadcrumb count={visible.length} />
      {table}
    </>
  );
};

// The main area: breadcrumb and table, or whichever state replaces them.
const ParameterBrowser = () => {
  const { loadState } = useParameters();
  const visible = useVisibleParameters();
  const { query } = useMatcher();

  return (
    <>
      {renderContent(loadState, visible, query)}
      <StatusBar />
    </>
  );
};

export default ParameterBrowser;
