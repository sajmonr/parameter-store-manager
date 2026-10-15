import React from 'react';
import { Button, Empty, Space, Typography } from 'antd';
import { useDispatch, useSelector } from 'react-redux';
import { actions as uiActions, selectors as uiSelectors } from '../../ducks/ui';
import styles from './StateLayout.module.css';

const NoResults = () => {
  const dispatch = useDispatch();
  const { query } = useSelector(uiSelectors.getMatcher);
  const scope = useSelector(uiSelectors.getScope);

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
          <Button onClick={() => dispatch(uiActions.setQuery(''))}>
            Clear search
          </Button>
          {scope && (
            <Button
              type="primary"
              onClick={() => dispatch(uiActions.setScope(''))}
            >
              Search all folders
            </Button>
          )}
        </Space>
      </Empty>
    </div>
  );
};

export default NoResults;
