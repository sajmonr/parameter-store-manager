import { useMemo } from 'react';
import type { CSSProperties } from 'react';
import { useParameters } from '../../state/parameters';
import { useUiStore } from '../../state/ui';
import {
  compareRows,
  countsByEnvironment,
  isFolderRow,
  rowHas
} from '../../utils/compare';
import type { CompareKey, Comparison } from '../../utils/compare';
import {
  COMPARE_KEY_COLUMN_WIDTH,
  COMPARE_MIN_ENV_COLUMN_WIDTH
} from '../../utils/layout';
import CompareProgress from './CompareProgress';
import CompareEmptyState from './compare/CompareEmptyState';
import CompareHeaderRow from './compare/CompareHeaderRow';
import FolderRow from './compare/FolderRow';
import KeyRow from './compare/KeyRow';
import LoadFailed from './compare/LoadFailed';
import PlaceholderRows from './compare/PlaceholderRows';
import styles from './CompareGrid.module.css';

interface CompareGridProps {
  comparison: Comparison;
  // The keys the filter lists.
  keys: CompareKey[];
  // False until a load has listed every name: the frame shows with
  // placeholder rows, or with no rows and a retry when the first load
  // `failed`.
  ready: boolean;
  failed: boolean;
}

// The service's keys under the folder, one column per environment. The
// header row and the key column stay put while the values scroll; the
// columns never get narrower than COMPARE_MIN_ENV_COLUMN_WIDTH, so many environments scroll
// sideways. The environments are known from the settings, so the header
// shows from the start and only the rows wait for the first load.
const CompareGrid = ({ comparison, keys, ready, failed }: CompareGridProps) => {
  const selectedName = useUiStore(state => state.selectedName);
  const revealed = useUiStore(state => state.revealed);
  const filter = useUiStore(state => state.compareFilter);
  const { loading } = useParameters();
  const rows = useMemo(() => compareRows(keys), [keys]);
  const { environments } = comparison;

  // Like the filter's counts: the keys matching the search, before the
  // filter.
  const counts = useMemo(() => countsByEnvironment(comparison), [comparison]);

  if (ready && !keys.length) {
    return <CompareEmptyState comparison={comparison} filter={filter} />;
  }

  const style = {
    '--compare-columns': `${COMPARE_KEY_COLUMN_WIDTH}px repeat(${environments.length}, minmax(${COMPARE_MIN_ENV_COLUMN_WIDTH}px, 1fr))`,
    minWidth:
      COMPARE_KEY_COLUMN_WIDTH +
      COMPARE_MIN_ENV_COLUMN_WIDTH * environments.length
  } as CSSProperties;

  return (
    <div className={styles.frame}>
      <div className={styles.scroll}>
        <div
          role="table"
          aria-label="Compare environments"
          aria-busy={loading || !ready}
          className={styles.grid}
          style={style}
        >
          <CompareHeaderRow
            environments={environments}
            counts={counts}
            ready={ready}
          />
          {!ready && !failed && (
            <PlaceholderRows columns={environments.length} />
          )}
          {ready &&
            rows.map(row => {
              if (isFolderRow(row)) return <FolderRow key={row.id} row={row} />;
              return (
                <KeyRow
                  key={row.key}
                  row={row}
                  environments={environments}
                  selectedName={rowHas(row, selectedName) ? selectedName : null}
                  revealed={revealed}
                />
              );
            })}
        </div>
      </div>
      {!ready && !failed && <CompareProgress />}
      {failed && <LoadFailed />}
    </div>
  );
};

export default CompareGrid;
