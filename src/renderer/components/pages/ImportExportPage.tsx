import { useState } from 'react';
import { Segmented } from 'antd';
import { DownloadOutlined, UploadOutlined } from '@ant-design/icons';
import { useImportStore } from '../../state/import';
import ExportPanel from '../importExport/ExportPanel';
import ImportPanel from '../importExport/ImportPanel';
import type { Mode } from '../importExport/formats';
import PageHeading from './PageHeading';
import styles from './Page.module.css';

// Export or Import, picked in the header. The page stays mounted, so the
// choice is kept for the session; both panels stay mounted too, so neither
// loses its state when the other is shown.
const ImportExportPage = () => {
  const [mode, setMode] = useState<Mode>('export');
  const importing = useImportStore(state => state.running);
  return (
    <div className={styles.scroll}>
      <div className={`${styles.content} ${styles.wide}`}>
        <PageHeading
          title="Import & export"
          description="Move parameters between this account and a file."
          extra={
            <Segmented<Mode>
              value={mode}
              onChange={setMode}
              disabled={importing}
              options={[
                {
                  value: 'export',
                  label: 'Export',
                  icon: <DownloadOutlined />
                },
                { value: 'import', label: 'Import', icon: <UploadOutlined /> }
              ]}
            />
          }
        />
        <div hidden={mode !== 'export'}>
          <ExportPanel />
        </div>
        <div hidden={mode !== 'import'}>
          <ImportPanel />
        </div>
      </div>
    </div>
  );
};

export default ImportExportPage;
