import { Button, Card, Flex, Typography } from 'antd';
import { SettingOutlined } from '@ant-design/icons';
import { uiActions } from '../../state/ui';
import PageHeading from './PageHeading';
import styles from './Page.module.css';

// Until the settings get their own sections, the page opens the settings
// modal.
// TODO(#31): replace with the settings sections.
const SettingsPage = () => (
  <div className={styles.scroll}>
    <div className={styles.content} style={{ maxWidth: 860 }}>
      <PageHeading
        title="Settings"
        description="Which account and region the app reads from, and how it looks."
      />
      <Card>
        <Flex vertical align="flex-start" gap={12}>
          <Typography.Text type="secondary">
            AWS profile, regions, path delimiter and theme.
          </Typography.Text>
          <Button icon={<SettingOutlined />} onClick={uiActions.openSettings}>
            Open settings
          </Button>
        </Flex>
      </Card>
    </div>
  </div>
);

export default SettingsPage;
