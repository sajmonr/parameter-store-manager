import { Segmented, Typography } from 'antd';
import { uiActions, useUiStore } from '../../state/ui';
import { useListComplete } from '../../state/views';
import type { CompareFilter, Comparison } from '../../utils/compare';
import { plural } from '../../utils/plural';
import EnvironmentDot from '../common/EnvironmentDot';
import styles from './ParameterBreadcrumb.module.css';

const FILTERS: { value: CompareFilter; label: string; color?: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'differs', label: 'Differs', color: 'var(--ant-color-warning)' },
  { value: 'missing', label: 'Missing', color: 'var(--ant-color-error)' }
];

// In place of the environment tabs while comparing: which keys to list, with
// the keys matching the search in each. Like the grid, the counts wait for
// the first load: a dash until then.
const CompareFilterTabs = ({ comparison }: { comparison: Comparison }) => {
  const filter = useUiStore(state => state.compareFilter);
  const ready = useListComplete();
  return (
    <>
      <Segmented
        aria-label="Compare filter"
        value={filter}
        onChange={value => uiActions.setCompareFilter(value)}
        options={FILTERS.map(({ value, label, color }) => ({
          value,
          label: (
            <span className={styles.env}>
              {color && <EnvironmentDot color={color} />}
              {label}
              <span className={styles.tabCount}>
                {ready ? comparison.counts[value] : '–'}
              </span>
            </span>
          )
        }))}
      />
      <Typography.Text type="secondary" className={styles.comparing}>
        Comparing {plural(comparison.environments.length, 'environment')}
      </Typography.Text>
    </>
  );
};

export default CompareFilterTabs;
