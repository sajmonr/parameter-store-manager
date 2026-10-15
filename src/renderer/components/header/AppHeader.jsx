import React from 'react';
import { Button, Flex, Layout, Tooltip } from 'antd';
import { PlusOutlined, SettingOutlined, SyncOutlined } from '@ant-design/icons';
import { useParameters } from '../../state/parameters';
import { uiActions } from '../../state/ui';
import ProfileChip from './ProfileChip';
import SearchInput from './SearchInput';
import SyncStatus from './SyncStatus';
import styles from './AppHeader.module.css';

const AppHeader = () => {
  const { loading, refresh } = useParameters();

  return (
    <Layout.Header className={styles.header}>
      <Flex align="center" gap={12} className={styles.row}>
        <ProfileChip />
        <SearchInput />
        <Flex align="center" gap={8} className={styles.end}>
          <SyncStatus />
          <Tooltip title="Refresh">
            <Button
              aria-label="Refresh"
              icon={<SyncOutlined spin={loading} />}
              disabled={loading}
              onClick={refresh}
            />
          </Tooltip>
          <Tooltip title="Settings">
            <Button
              aria-label="Settings"
              icon={<SettingOutlined />}
              onClick={uiActions.openSettings}
            />
          </Tooltip>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => uiActions.openNewParameter()}
          >
            New parameter
          </Button>
        </Flex>
      </Flex>
    </Layout.Header>
  );
};

export default AppHeader;
