import React from 'react';
import { Button, Empty, Space, Typography } from 'antd';
import { PlusOutlined, SettingOutlined } from '@ant-design/icons';
import { useDispatch, useSelector } from 'react-redux';
import { selectors as settingsSelectors } from '../../ducks/settings';
import { actions as uiActions } from '../../ducks/ui';
import styles from './StateLayout.module.css';

const EmptyAccount = () => {
  const dispatch = useDispatch();
  const profile = useSelector(settingsSelectors.getProfile) || 'default';
  const region = useSelector(settingsSelectors.getSsmRegion);

  return (
    <div className={styles.center}>
      <Empty
        className={styles.content}
        description={
          <>
            <Typography.Text strong>No parameters in {region}</Typography.Text>
            <Typography.Text type="secondary" className={styles.hint}>
              Profile <Typography.Text code>{profile}</Typography.Text> can read
              Parameter Store here, but nothing has been created yet. Wrong
              region? Change it in Settings.
            </Typography.Text>
          </>
        }
      >
        <Space>
          <Button
            icon={<SettingOutlined />}
            onClick={() => dispatch(uiActions.openSettings())}
          >
            Settings
          </Button>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => dispatch(uiActions.openNewParameter())}
          >
            New parameter
          </Button>
        </Space>
      </Empty>
    </div>
  );
};

export default EmptyAccount;
