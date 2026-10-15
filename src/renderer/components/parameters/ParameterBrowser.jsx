import React from 'react';
import { useSelector } from 'react-redux';
import {
  LOAD_STATES,
  selectors as parameterSelectors
} from '../../ducks/parameters';
import { selectors as uiSelectors } from '../../ducks/ui';
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
    case LOAD_STATES.loading:
      return <TableSkeleton />;
    case LOAD_STATES.empty:
      return <EmptyAccount />;
    case LOAD_STATES.ready:
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
  const loadState = useSelector(parameterSelectors.getLoadState);
  const visible = useSelector(uiSelectors.getVisibleParameters);
  const { query } = useSelector(uiSelectors.getMatcher);

  return (
    <>
      {renderContent(loadState, visible, query)}
      <StatusBar />
    </>
  );
};

export default ParameterBrowser;
