import React from 'react';
import PropTypes from 'prop-types';
import { Skeleton } from 'antd';
import styles from './StateLayout.module.css';

// Widths of the name and value placeholders, so rows don't look identical.
const ROWS = [
  [40, 55],
  [60, 30],
  [35, 70],
  [50, 40],
  [45, 60],
  [30, 35],
  [55, 50],
  [40, 45]
];

const Bar = ({ width, height }) => (
  <Skeleton.Input
    active
    size="small"
    style={{ width: `${width}%`, minWidth: 0, height }}
  />
);

Bar.propTypes = {
  height: PropTypes.number.isRequired,
  width: PropTypes.number.isRequired
};

const TableSkeleton = () => (
  <div
    className={styles.skeleton}
    aria-busy="true"
    aria-label="Loading parameters"
  >
    <div className={styles.skeletonHeader}>
      <span className={styles.skeletonName}>Name</span>
      <span>Value</span>
    </div>
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
