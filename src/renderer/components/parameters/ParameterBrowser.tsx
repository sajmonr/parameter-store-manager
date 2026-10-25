import { useMemo } from 'react';
import { useParameters } from '../../state/parameters';
import type { LoadState, ParameterEntry } from '../../state/parameters';
import { useUiStore } from '../../state/ui';
import {
  useCheckedNames,
  useComparison,
  useComparisonReady,
  useMatcher,
  useVisibleParameters
} from '../../state/views';
import { filterKeys } from '../../utils/compare';
import type { CompareKey, Comparison } from '../../utils/compare';
import CompareGrid from './CompareGrid';
import CompareLoading from './CompareLoading';
import ParameterBreadcrumb from './ParameterBreadcrumb';
import ParameterTable from './ParameterTable';
import StatusBar from './StatusBar';
import TableSkeleton from '../states/TableSkeleton';
import NoResults from '../states/NoResults';
import EmptyFolder from '../states/EmptyFolder';
import EmptyAccount from '../states/EmptyAccount';
import ConnectionError from '../states/ConnectionError';

// What compare mode lists: the comparison and the keys its filter keeps,
// which aren't shown until the first load is `ready`.
export interface Compared {
  comparison: Comparison;
  keys: CompareKey[];
  ready: boolean;
}

const renderContent = (
  loadState: LoadState,
  visible: ParameterEntry[],
  checked: string[],
  query: string,
  compared: Compared | null
) => {
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

  if (compared) {
    return (
      <>
        <ParameterBreadcrumb
          count={compared.keys.length}
          checked={[]}
          comparison={compared.comparison}
        />
        {compared.ready ? <CompareGrid {...compared} /> : <CompareLoading />}
      </>
    );
  }

  let table = <ParameterTable parameters={visible} checked={checked} />;
  if (!visible.length) table = query ? <NoResults /> : <EmptyFolder />;
  return (
    <>
      <ParameterBreadcrumb count={visible.length} checked={checked} />
      {table}
    </>
  );
};

// The main area: breadcrumb and table or comparison, or whichever state
// replaces them.
const ParameterBrowser = () => {
  const { loadState } = useParameters();
  const visible = useVisibleParameters();
  const checked = useCheckedNames();
  const { query } = useMatcher();
  const comparison = useComparison();
  const ready = useComparisonReady();
  const filter = useUiStore(state => state.compareFilter);
  const compared = useMemo(
    () =>
      comparison && {
        comparison,
        keys: filterKeys(comparison.keys, filter),
        ready
      },
    [comparison, filter, ready]
  );

  return (
    <>
      {renderContent(loadState, visible, checked, query, compared)}
      <StatusBar compared={compared} />
    </>
  );
};

export default ParameterBrowser;
