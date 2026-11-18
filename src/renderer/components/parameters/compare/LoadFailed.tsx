import { useQueryClient } from '@tanstack/react-query';
import { Alert, Button } from 'antd';
import { refreshParameters } from '../../../state/parameters';
import styles from '../CompareGrid.module.css';

// In place of the rows when the first load stopped partway: the names it
// listed aren't all of them, so nothing is compared. It doesn't read the
// parameters itself: a failed query reloads when a new reader mounts, so
// showing this would retry on its own, again after every failure.
const LoadFailed = () => {
  const client = useQueryClient();
  return (
    <div className={styles.progress}>
      <Alert
        type="error"
        showIcon
        title="Couldn't load every parameter"
        description="Environments can't be compared until they have all loaded."
        action={
          <Button size="small" onClick={() => void refreshParameters(client)}>
            Retry
          </Button>
        }
      />
    </div>
  );
};

export default LoadFailed;
