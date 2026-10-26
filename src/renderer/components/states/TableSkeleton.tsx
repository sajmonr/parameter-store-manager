import { Skeleton } from 'antd';
import styles from './StateLayout.module.css';

// Widths of the name and value placeholders, so rows don't look identical.
const ROWS: [name: number, value: number][] = [
  [40, 55],
  [60, 30],
  [35, 70],
  [50, 40],
  [45, 60],
  [30, 35],
  [55, 50],
  [40, 45]
];

const Bar = ({ width, height }: { width: number; height: number }) => (
  <Skeleton.Input
    active
    size="small"
    style={{ width: `${width}%`, minWidth: 0, height }}
  />
);

// The table's rows during the first load, under its real header (see
// ParameterTable's `placeholder`), lined up with its name and value columns.
const TableSkeleton = () => (
  <div aria-busy="true" aria-label="Loading parameters">
    {ROWS.map(([name, value], index) => (
      <div key={index} className={styles.skeletonRow}>
        <div className={styles.skeletonName}>
          <Bar width={name} height={14} />
          <Bar width={30} height={10} />
        </div>
        <div className={styles.skeletonValue}>
          <Bar width={value} height={14} />
        </div>
      </div>
    ))}
  </div>
);

export default TableSkeleton;
