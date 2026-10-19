import { Card, Flex } from 'antd';
import { FileTextOutlined } from '@ant-design/icons';
import ExportForm from '../export/ExportForm';
import PageHeading from './PageHeading';
import styles from './Page.module.css';

// One card per format.
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
        <ExportForm />
      </Card>
    </div>
  </div>
);

export default ImportExportPage;
