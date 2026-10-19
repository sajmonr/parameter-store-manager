import type { ReactNode } from 'react';
import { Badge, Button, Tooltip } from 'antd';
import {
  SettingOutlined,
  SwapOutlined,
  UnorderedListOutlined
} from '@ant-design/icons';
import { describeProgress, useExportStore } from '../../state/export';
import { uiActions, useUiStore } from '../../state/ui';
import type { Page } from '../../state/ui';
import { settingsShortcutLabel } from '../../utils/keys';
import styles from './Rail.module.css';

interface RailItemProps {
  page: Page;
  label: string;
  tooltip?: string;
  icon: ReactNode;
  // Shows a pulsing dot, for work that runs while the page isn't shown.
  busy?: boolean;
  onClick: () => void;
}

const RailItem = ({
  page,
  label,
  tooltip = label,
  icon,
  busy = false,
  onClick
}: RailItemProps) => {
  const active = useUiStore(state => state.page === page);
  // The Badge stays when the dot goes, so the button keeps keyboard focus.
  return (
    <Tooltip title={tooltip} placement="right">
      <Badge status="processing" dot={busy} offset={[-4, 4]}>
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
      </Badge>
    </Tooltip>
  );
};

// While an export runs, the tooltip says how far it's got.
const ImportExportItem = () => {
  const running = useExportStore(state => state.running);
  const progress = useExportStore(state => state.progress);
  const label = 'Import & export';
  return (
    <RailItem
      page="importExport"
      label={label}
      tooltip={progress ? `${label}: ${describeProgress(progress)}` : undefined}
      icon={<SwapOutlined rotate={90} />}
      busy={running}
      onClick={() => uiActions.showPage('importExport')}
    />
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
    <ImportExportItem />
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
