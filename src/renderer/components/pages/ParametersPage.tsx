import { Flex, Layout, Splitter } from 'antd';
import useMediaQuery from '../../hooks/useMediaQuery';
import useResizableWidth from '../../hooks/useResizableWidth';
import useWindowWidth from '../../hooks/useWindowWidth';
import {
  NARROW_QUERY,
  SIDER_DEFAULT_WIDTH,
  SIDER_NARROW_DEFAULT_WIDTH,
  SIDER_WIDTH_STORAGE_KEY,
  SIDER_MIN_WIDTH,
  siderMaxWidth
} from '../../utils/layout';
import AppHeader from '../header/AppHeader';
import Sidebar from '../sidebar/Sidebar';
import ParameterBrowser from '../parameters/ParameterBrowser';
import DetailHost from '../detail/DetailHost';
import DeleteModal from '../delete/DeleteModal';
import CopyModal from '../copy/CopyModal';
import styles from './ParametersPage.module.css';

// The header; the sidebar, resized by dragging its edge (double-click
// resets it); the table and the detail pane; the delete confirmation and
// the copy dialog.
const ParametersPage = () => {
  const narrow = useMediaQuery(NARROW_QUERY);
  const siderMax = siderMaxWidth(useWindowWidth(), narrow);
  const sider = useResizableWidth({
    storageKey: SIDER_WIDTH_STORAGE_KEY,
    defaultWidth: narrow ? SIDER_NARROW_DEFAULT_WIDTH : SIDER_DEFAULT_WIDTH,
    min: SIDER_MIN_WIDTH,
    max: siderMax
  });

  return (
    <Layout className={styles.page}>
      <AppHeader />
      <Splitter
        className={styles.body}
        onResize={([width]) => width !== undefined && sider.setWidth(width)}
        onDraggerDoubleClick={sider.reset}
      >
        <Splitter.Panel
          size={sider.width}
          min={SIDER_MIN_WIDTH}
          max={siderMax}
          className={styles.panel}
        >
          <Flex
            vertical
            component="nav"
            aria-label="Sidebar"
            className={styles.fill}
          >
            <Sidebar />
          </Flex>
        </Splitter.Panel>
        <Splitter.Panel className={styles.panel}>
          <Flex className={styles.fill}>
            <Layout.Content className={styles.main}>
              <ParameterBrowser />
            </Layout.Content>
            <DetailHost narrow={narrow} />
          </Flex>
        </Splitter.Panel>
      </Splitter>
      <DeleteModal />
      <CopyModal />
    </Layout>
  );
};

export default ParametersPage;
