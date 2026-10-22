import { Button, Flex, Layout, Tooltip } from 'antd';
import { PlusOutlined, SyncOutlined } from '@ant-design/icons';
import { useParameters } from '../../state/parameters';
import { uiActions } from '../../state/ui';
import SearchInput from './SearchInput';
import styles from './AppHeader.module.css';

// The search, centred, and the actions on the right. Settings, including the
// AWS profile and region, and the export live in the rail.
const AppHeader = () => {
  const { loading, refresh } = useParameters();

  return (
    <Layout.Header className={styles.header}>
      <div className={styles.row}>
        <div className={styles.center}>
          <SearchInput />
        </div>
        <Flex align="center" gap={8} className={styles.end}>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => uiActions.openNewParameter()}
          >
            New parameter
          </Button>
          <Tooltip title="Refresh">
            <Button
              aria-label="Refresh"
              icon={<SyncOutlined spin={loading} />}
              disabled={loading}
              onClick={() => refresh()}
            />
          </Tooltip>
        </Flex>
      </div>
    </Layout.Header>
  );
};

export default AppHeader;
