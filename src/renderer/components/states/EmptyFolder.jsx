import React from 'react';
import { Button, Empty } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { useDispatch } from 'react-redux';
import { actions as uiActions } from '../../ducks/ui';
import styles from './StateLayout.module.css';

const EmptyFolder = () => {
  const dispatch = useDispatch();
  return (
    <div className={styles.center}>
      <Empty className={styles.content} description="This folder is empty">
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => dispatch(uiActions.openNewParameter())}
        >
          New parameter here
        </Button>
      </Empty>
    </div>
  );
};

export default EmptyFolder;
