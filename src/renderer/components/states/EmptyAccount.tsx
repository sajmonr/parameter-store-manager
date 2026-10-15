import { Button, Empty, Space, Typography } from 'antd';
import { PlusOutlined, SettingOutlined } from '@ant-design/icons';
import { useSettingsStore } from '../../state/settings';
import { uiActions } from '../../state/ui';
import styles from './StateLayout.module.css';

const EmptyAccount = () => {
  const profile = useSettingsStore(settings => settings.profile) || 'default';
  const region = useSettingsStore(settings => settings.ssmRegion);

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
          <Button icon={<SettingOutlined />} onClick={uiActions.openSettings}>
            Settings
          </Button>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => uiActions.openNewParameter()}
          >
            New parameter
          </Button>
        </Space>
      </Empty>
    </div>
  );
};

export default EmptyAccount;
