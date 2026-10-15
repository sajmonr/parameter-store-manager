import React from 'react';
import { Button, Empty } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { uiActions } from '../../state/ui';
import styles from './StateLayout.module.css';

const EmptyFolder = () => (
  <div className={styles.center}>
    <Empty className={styles.content} description="This folder is empty">
      <Button
        type="primary"
        icon={<PlusOutlined />}
        onClick={() => uiActions.openNewParameter()}
      >
        New parameter here
      </Button>
    </Empty>
  </div>
);

export default EmptyFolder;
