import type { ReactNode } from 'react';
import { Badge, Button, Tooltip } from 'antd';
import {
  SettingOutlined,
  SwapOutlined,
  UnorderedListOutlined
} from '@ant-design/icons';
import { describeProgress, useExportStore } from '../../state/export';
import { useImportStore } from '../../state/import';
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
  // An import can't be left until it finishes (see ui.showPage).
  const locked = useImportStore(state => state.running) && !active;
  // The Badge stays when the dot goes, so the button keeps keyboard focus.
  return (
    <Tooltip
      title={locked ? `${label}: available once the import finishes` : tooltip}
      placement="right"
    >
      <Badge status="processing" dot={busy} offset={[-4, 4]}>
        <Button
          color={active ? 'primary' : 'default'}
          variant={active ? 'filled' : 'text'}
          icon={icon}
          aria-label={label}
          aria-current={active ? 'page' : undefined}
          // Large is the rail's 40×40 with an 8px radius.
          size="large"
          disabled={locked}
          onClick={onClick}
        />
      </Badge>
    </Tooltip>
  );
};

// While an export or import runs, the tooltip says how far it's got.
const ImportExportItem = () => {
  const exporting = useExportStore(state => state.running);
  const progress = useExportStore(state => state.progress);
  const importing = useImportStore(state => state.running);
  const imported = useImportStore(state => state.done);
  const toImport = useImportStore(state => state.total);
  const label = 'Import & export';
  let tooltip: string | undefined;
  if (importing) {
    tooltip = `${label}: Importing ${imported.toLocaleString()} of ${toImport.toLocaleString()}…`;
  } else if (progress) {
    tooltip = `${label}: ${describeProgress(progress)}`;
  }
  return (
    <RailItem
      page="importExport"
      label={label}
      tooltip={tooltip}
      icon={<SwapOutlined />}
      busy={exporting || importing}
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
