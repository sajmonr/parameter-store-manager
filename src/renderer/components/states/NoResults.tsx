import { Button, Empty, Space, Typography } from 'antd';
import { uiActions, useUiStore } from '../../state/ui';
import { useMatcher } from '../../state/views';
import styles from './StateLayout.module.css';

const NoResults = () => {
  const { query } = useMatcher();
  const scope = useUiStore(state => state.scope);

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
              {scope
                ? 'Only this folder is searched. Clear the folder to search everything.'
                : 'Plain text matches anywhere in the name. Use * or a leading / for globs.'}
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
