import { Button, Card, Flex, Typography } from 'antd';
import { DownloadOutlined, FileTextOutlined } from '@ant-design/icons';
import { uiActions } from '../../state/ui';
import PageHeading from './PageHeading';
import styles from './Page.module.css';

// One card per format. Until the export moves onto the page, its card opens
// the export modal.
// TODO(#32): replace the button with the export form.
const ImportExportPage = () => (
  <div className={styles.scroll}>
    <div className={styles.content} style={{ maxWidth: 760 }}>
      <PageHeading
        title="Import & export"
        description="Save parameters to a file."
      />
      <Card
        title={
          <Flex align="center" gap={8}>
            <FileTextOutlined />
            Export to CSV
          </Flex>
        }
      >
        <Flex vertical align="flex-start" gap={12}>
          <Typography.Text type="secondary">
            All parameters, or the ones under a path.
          </Typography.Text>
          <Button icon={<DownloadOutlined />} onClick={uiActions.openExport}>
            Export as CSV…
          </Button>
        </Flex>
      </Card>
    </div>
  </div>
);

export default ImportExportPage;
