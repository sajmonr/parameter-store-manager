import type { ReactNode } from 'react';
import { Button, Tooltip } from 'antd';
import {
  SettingOutlined,
  SwapOutlined,
  UnorderedListOutlined
} from '@ant-design/icons';
import { uiActions, useUiStore } from '../../state/ui';
import type { Page } from '../../state/ui';
import { settingsShortcutLabel } from '../../utils/keys';
import styles from './Rail.module.css';

interface RailItemProps {
  page: Page;
  label: string;
  tooltip?: string;
  icon: ReactNode;
  onClick: () => void;
}

const RailItem = ({
  page,
  label,
  tooltip = label,
  icon,
  onClick
}: RailItemProps) => {
  const active = useUiStore(state => state.page === page);
  return (
    <Tooltip title={tooltip} placement="right">
      <Button
        color={active ? 'primary' : 'default'}
        variant={active ? 'filled' : 'text'}
        icon={icon}
        aria-label={label}
        aria-current={active ? 'page' : undefined}
        // Large is the rail's 40×40 with an 8px radius.
        size="large"
        onClick={onClick}
      />
    </Tooltip>
  );
};

// The app's pages, with Settings pinned to the bottom.
const Rail = () => (
  <nav className={styles.rail} aria-label="Pages">
    <RailItem
      page="parameters"
      label="Parameters"
      icon={<UnorderedListOutlined />}
      onClick={() => uiActions.showPage('parameters')}
    />
    <RailItem
      page="importExport"
      label="Import & export"
      icon={<SwapOutlined rotate={90} />}
      onClick={() => uiActions.showPage('importExport')}
    />
    <div className={styles.spacer} />
    <RailItem
      page="settings"
      label="Settings"
      tooltip={`Settings (${settingsShortcutLabel})`}
      icon={<SettingOutlined />}
      onClick={() => uiActions.openSettings()}
    />
  </nav>
);

export default Rail;
