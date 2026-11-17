import SkeletonBar, { PLACEHOLDER_WIDTHS } from '../common/SkeletonBar';
import styles from './StateLayout.module.css';

// The table's rows during the first load, under its real header (see
// ParameterTable's `placeholder`), lined up with its name and value columns.
const TableSkeleton = () => (
  <div aria-busy="true" aria-label="Loading parameters">
    {PLACEHOLDER_WIDTHS.map(([name, value], index) => (
      <div key={index} className={styles.skeletonRow}>
        <div className={styles.skeletonName}>
          <SkeletonBar width={name} height={14} />
          <SkeletonBar width={30} height={10} />
        </div>
        <div className={styles.skeletonValue}>
          <SkeletonBar width={value} height={14} />
        </div>
      </div>
    ))}
  </div>
);

export default TableSkeleton;
