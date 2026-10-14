import React, { useEffect } from 'react';
import { Layout } from 'antd';
import { useDispatch } from 'react-redux';
import { actions as parameterActions } from '../ducks/parameters';
import useMediaQuery from '../hooks/useMediaQuery';
import useResizableWidth from '../hooks/useResizableWidth';
import ResizeHandle from './common/ResizeHandle';
import AppHeader from './header/AppHeader';
import FolderTree from './sidebar/FolderTree';
import ParameterBrowser from './parameters/ParameterBrowser';
import DetailHost from './detail/DetailHost';
import SettingsModal from './settings/SettingsModal';
import styles from './AppShell.module.css';

// Below this width the detail pane becomes a drawer.
export const NARROW_QUERY = '(max-width: 1099px)';

const SIDER_MIN_WIDTH = 180;
const SIDER_MAX_WIDTH = 600;

const AppShell = () => {
  const dispatch = useDispatch();
  const narrow = useMediaQuery(NARROW_QUERY);
  const sider = useResizableWidth({
    storageKey: 'siderWidth',
    defaultWidth: narrow ? 220 : 240,
    min: SIDER_MIN_WIDTH,
    max: SIDER_MAX_WIDTH
  });

  useEffect(() => {
    dispatch(parameterActions.fetchAllParameters());
  }, [dispatch]);

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
            max={SIDER_MAX_WIDTH}
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
