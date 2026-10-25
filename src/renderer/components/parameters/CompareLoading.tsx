import { useEffect, useState } from 'react';
import { Alert } from 'antd';
import { useLoadProgress } from '../../state/parameters';
import type { LoadProgress } from '../../state/parameters';
import TableSkeleton from '../states/TableSkeleton';
import styles from './CompareGrid.module.css';

// How long a load may take before the progress message shows, so a fast
// load doesn't flash it.
export const PROGRESS_DELAY_MS = 3000;

const progressText = ({ found, listed, valuesDone }: LoadProgress) => {
  if (!listed) {
    return `Loading parameters… ${found.toLocaleString()} found`;
  }
  const percent = found ? Math.floor((valuesDone / found) * 100) : 100;
  return `Loading values… ${percent}% (${valuesDone.toLocaleString()} of ${found.toLocaleString()})`;
};

// In place of the grid during the first load: the comparison appears once
// every name and value is in. A slow load says how far it has got.
const CompareLoading = () => {
  const progress = useLoadProgress();
  const [slow, setSlow] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setSlow(true), PROGRESS_DELAY_MS);
    return () => clearTimeout(timer);
  }, []);

  return (
    <>
      {slow && (
        <Alert
          type="info"
          showIcon
          className={styles.progress}
          title={progressText(progress)}
          description="The comparison appears when everything is in."
        />
      )}
      <TableSkeleton nameTitle="Key" />
    </>
  );
};

export default CompareLoading;
