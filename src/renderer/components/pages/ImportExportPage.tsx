import { useState } from 'react';
import { DownloadOutlined, UploadOutlined } from '@ant-design/icons';
import { useImportStore } from '../../state/import';
import ExportPanel from '../importExport/ExportPanel';
import ImportPanel from '../importExport/ImportPanel';
import OptionCards from '../importExport/OptionCards';
import type { CardOption } from '../importExport/OptionCards';
import type { Mode } from '../importExport/formats';
import PageHeading from './PageHeading';
import styles from './Page.module.css';

const MODES: CardOption<Mode>[] = [
  {
    value: 'export',
    label: 'Export',
    icon: <DownloadOutlined />,
    description: 'Save parameters to a file.'
  },
  {
    value: 'import',
    label: 'Import',
    icon: <UploadOutlined />,
    description: 'Load parameters from a file.'
  }
];

// Export or Import, picked with the cards under the title. The page stays
// mounted, so the choice is kept for the session; both panels stay mounted
// too, so neither loses its state when the other is shown.
const ImportExportPage = () => {
  const [mode, setMode] = useState<Mode>('export');
  const importing = useImportStore(state => state.running);
  return (
    <div className={styles.scroll}>
      <div className={`${styles.content} ${styles.wide}`}>
        <PageHeading
          title="Import & export"
          description="Move parameters between this account and a file."
        />
        <div className={styles.modes}>
          <OptionCards
            label="Export or import"
            options={MODES}
            value={mode}
            onChange={setMode}
            disabled={importing}
            fill
          />
        </div>
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
