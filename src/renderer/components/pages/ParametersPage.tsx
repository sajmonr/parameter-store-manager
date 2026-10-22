import { Layout } from 'antd';
import useMediaQuery from '../../hooks/useMediaQuery';
import useResizableWidth from '../../hooks/useResizableWidth';
import useWindowWidth from '../../hooks/useWindowWidth';
import {
  NARROW_QUERY,
  SIDER_MIN_WIDTH,
  siderMaxWidth
} from '../../utils/layout';
import ResizeHandle from '../common/ResizeHandle';
import AppHeader from '../header/AppHeader';
import Sidebar from '../sidebar/Sidebar';
import ParameterBrowser from '../parameters/ParameterBrowser';
import DetailHost from '../detail/DetailHost';
import DeleteModal from '../delete/DeleteModal';
import styles from './ParametersPage.module.css';

// The header, sidebar, table and detail pane, and the delete confirmation.
const ParametersPage = () => {
  const narrow = useMediaQuery(NARROW_QUERY);
  const siderMax = siderMaxWidth(useWindowWidth(), narrow);
  const sider = useResizableWidth({
    storageKey: 'siderWidth',
    defaultWidth: narrow ? 220 : 240,
    min: SIDER_MIN_WIDTH,
    max: siderMax
  });

  return (
    <Layout className={styles.page}>
      <AppHeader />
      <Layout className={styles.body}>
        <Layout.Sider
          theme="light"
          width={sider.width}
          className={styles.sider}
        >
          <Sidebar />
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
      <DeleteModal />
    </Layout>
  );
};

export default ParametersPage;
