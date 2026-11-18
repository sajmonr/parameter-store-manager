import { Button, Flex, Layout, Tooltip } from 'antd';
import { PlusOutlined, SyncOutlined } from '@ant-design/icons';
import { useParameters } from '../../state/parameters';
import { uiActions } from '../../state/ui';
import SearchInput from './SearchInput';
import { SEARCH_MAX_WIDTH } from '../../utils/layout';
import styles from './AppHeader.module.css';

// The search, centred, and the actions on the right. Settings, including the
// AWS profile and region, and the export live in the rail.
const AppHeader = () => {
  const { loading, refresh } = useParameters();

  return (
    <Layout.Header className={styles.header}>
      <Flex align="center" gap="var(--ant-margin-sm)" className={styles.row}>
        <Flex flex="1 1 0" />
        <Flex flex={`0 1 ${SEARCH_MAX_WIDTH}px`} className={styles.center}>
          <SearchInput />
        </Flex>
        <Flex flex="1 1 0" justify="flex-end" align="center" gap="small">
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
      </Flex>
    </Layout.Header>
  );
};

export default AppHeader;
