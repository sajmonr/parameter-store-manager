import React from 'react';
import { Button, Flex, Layout, Tooltip } from 'antd';
import { PlusOutlined, SettingOutlined, SyncOutlined } from '@ant-design/icons';
import { useDispatch, useSelector } from 'react-redux';
import {
  actions as parameterActions,
  selectors as parameterSelectors
} from '../../ducks/parameters';
import { actions as uiActions } from '../../ducks/ui';
import ProfileChip from './ProfileChip';
import SearchInput from './SearchInput';
import SyncStatus from './SyncStatus';
import styles from './AppHeader.module.css';

const AppHeader = () => {
  const dispatch = useDispatch();
  const loading = useSelector(parameterSelectors.getIsAllParametersLoading);

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
              icon={<SyncOutlined spin={!!loading} />}
              disabled={!!loading}
              onClick={() => dispatch(parameterActions.fetchAllParameters())}
            />
          </Tooltip>
          <Tooltip title="Settings">
            <Button
              aria-label="Settings"
              icon={<SettingOutlined />}
              onClick={() => dispatch(uiActions.openSettings())}
            />
          </Tooltip>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => dispatch(uiActions.openNewParameter())}
          >
            New parameter
          </Button>
        </Flex>
      </Flex>
    </Layout.Header>
  );
};

export default AppHeader;
