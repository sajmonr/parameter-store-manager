import { Button, Empty, Space, Typography } from 'antd';
import { uiActions } from '../../state/ui';
import { useLocation, useMatcher } from '../../state/views';
import styles from './StateLayout.module.css';

const NoResults = () => {
  const { query } = useMatcher();
  const location = useLocation();
  // Only the Paths view can widen to all parameters; the Services view's
  // sidebar counts where the matches are.
  const scope = location.view === 'paths' ? location.scope : '';
  let hint =
    'Plain text matches anywhere in the name. Use * or a leading / for globs.';
  if (scope) {
    hint =
      'Only this folder is searched. Clear the folder to search everything.';
  } else if (location.view !== 'paths') {
    hint = 'The sidebar counts the matches in every service and environment.';
  }

  return (
    <div className={styles.center}>
      <Empty
        className={styles.content}
        description={
          <>
            <Typography.Text>
              No parameters match{' '}
              <Typography.Text code>{query}</Typography.Text>
            </Typography.Text>
            <Typography.Text type="secondary" className={styles.hint}>
              {hint}
            </Typography.Text>
          </>
        }
      >
        <Space>
          <Button onClick={() => uiActions.setQuery('')}>Clear search</Button>
          {scope && (
            <Button type="primary" onClick={() => uiActions.setScope('')}>
              Search all folders
            </Button>
          )}
        </Space>
      </Empty>
    </div>
  );
};

export default NoResults;
