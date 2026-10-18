import { useEffect } from 'react';
import { Button, Dropdown, Flex, Layout } from 'antd';
import type { MenuProps } from 'antd';
import {
  DownloadOutlined,
  EllipsisOutlined,
  PlusOutlined,
  SettingOutlined,
  SyncOutlined
} from '@ant-design/icons';
import { useParameters } from '../../state/parameters';
import { uiActions } from '../../state/ui';
import { isSettingsShortcut, settingsShortcutLabel } from '../../utils/keys';
import ProfileChip from './ProfileChip';
import SearchInput from './SearchInput';
import styles from './AppHeader.module.css';

const onSettingsShortcut = (event: KeyboardEvent) => {
  if (!isSettingsShortcut(event)) return;
  event.preventDefault();
  uiActions.openSettings();
};

const AppHeader = () => {
  const { loading, refresh } = useParameters();

  useEffect(() => {
    window.addEventListener('keydown', onSettingsShortcut);
    return () => window.removeEventListener('keydown', onSettingsShortcut);
  }, []);

  // Everything but creating a parameter lives in the More menu.
  const moreActions: MenuProps = {
    items: [
      {
        key: 'refresh',
        icon: <SyncOutlined />,
        label: 'Refresh',
        disabled: loading
      },
      { key: 'export', icon: <DownloadOutlined />, label: 'Export as CSV' },
      { type: 'divider' },
      {
        key: 'settings',
        icon: <SettingOutlined />,
        label: 'Settings',
        extra: settingsShortcutLabel
      }
    ],
    onClick: ({ key }) => {
      if (key === 'refresh') refresh();
      else if (key === 'export') uiActions.openExport();
      else if (key === 'settings') uiActions.openSettings();
    }
  };

  return (
    <Layout.Header className={styles.header}>
      <Flex align="center" gap={12} className={styles.row}>
        <ProfileChip />
        <SearchInput />
        <Flex align="center" gap={8} className={styles.end}>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => uiActions.openNewParameter()}
          >
            New parameter
          </Button>
          <Dropdown
            menu={moreActions}
            trigger={['click']}
            placement="bottomRight"
          >
            <Button aria-label="More" icon={<EllipsisOutlined />} />
          </Dropdown>
        </Flex>
      </Flex>
    </Layout.Header>
  );
};

export default AppHeader;
