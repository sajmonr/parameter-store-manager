import { Layout } from 'antd';
import useMediaQuery from '../hooks/useMediaQuery';
import useResizableWidth from '../hooks/useResizableWidth';
import useWindowWidth from '../hooks/useWindowWidth';
import ResizeHandle from './common/ResizeHandle';
import AppHeader from './header/AppHeader';
import FolderTree from './sidebar/FolderTree';
import ParameterBrowser from './parameters/ParameterBrowser';
import DetailHost, { PANE_WIDTH } from './detail/DetailHost';
import SettingsModal from './settings/SettingsModal';
import styles from './AppShell.module.css';

// Below this width the detail pane becomes a drawer.
export const NARROW_QUERY = '(max-width: 1099px)';

const SIDER_MIN_WIDTH = 180;
const SIDER_MAX_WIDTH = 600;
// The sider never squeezes the table below this, even with the pane open.
const MIN_TABLE_WIDTH = 360;

export const siderMaxWidth = (windowWidth: number, narrow: boolean) =>
  Math.max(
    SIDER_MIN_WIDTH,
    Math.min(
      SIDER_MAX_WIDTH,
      windowWidth - (narrow ? 0 : PANE_WIDTH) - MIN_TABLE_WIDTH
    )
  );

const AppShell = () => {
  const narrow = useMediaQuery(NARROW_QUERY);
  const siderMax = siderMaxWidth(useWindowWidth(), narrow);
  const sider = useResizableWidth({
    storageKey: 'siderWidth',
    defaultWidth: narrow ? 220 : 240,
    min: SIDER_MIN_WIDTH,
    max: siderMax
  });

  return (
    <Layout className={styles.shell}>
      <AppHeader />
      <Layout className={styles.body}>
        <Layout.Sider
          theme="light"
          width={sider.width}
          className={styles.sider}
        >
          <FolderTree />
          <ResizeHandle
            label="Resize folder tree"
            width={sider.width}
            min={SIDER_MIN_WIDTH}
            max={siderMax}
            onResize={sider.setWidth}
            onReset={sider.reset}
          />
        </Layout.Sider>
        <Layout.Content className={styles.main}>
          <ParameterBrowser />
        </Layout.Content>
        <DetailHost narrow={narrow} />
      </Layout>
      <SettingsModal />
    </Layout>
  );
};

export default AppShell;
