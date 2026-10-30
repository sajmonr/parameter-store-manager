import { useEffect, useState } from 'react';
import { Alert } from 'antd';
import { useLoadProgress } from '../../state/parameters';
import { describeLoadProgress } from '../../utils/progress';
import styles from './CompareGrid.module.css';

// How long a load may take before the progress message shows, so a fast
// load doesn't flash it.
export const PROGRESS_DELAY_MS = 3000;

// How far a slow first load has got, over the grid's placeholder rows so
// nothing moves when it shows.
const CompareProgress = () => {
  const progress = useLoadProgress();
  const [slow, setSlow] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setSlow(true), PROGRESS_DELAY_MS);
    return () => clearTimeout(timer);
  }, []);
  if (!slow) return null;

  return (
    <div className={styles.progress}>
      <Alert
        type="info"
        showIcon
        title={describeLoadProgress(progress)}
        description="The comparison appears when everything is in."
      />
    </div>
  );
};

export default CompareProgress;
