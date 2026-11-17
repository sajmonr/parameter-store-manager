import { Typography } from 'antd';
import { PARAMETER_TYPE } from '../../../../shared/parameterTypes';
import { CSV_HEADER } from '../../../utils/csv';
import type { Format } from '../../../utils/formats';
import { toJsonExport } from '../../../utils/jsonExport';
import ExportSection from './ExportSection';
import styles from '../ExportPanel.module.css';

// The shape of a JSON export, shown instead of column options.
const JSON_SAMPLE = toJsonExport({
  region: 'us-east-1',
  decrypted: true,
  date: new Date('2026-10-14T09:12:00Z'),
  parameters: [
    {
      name: '/app/prod/Enabled',
      type: PARAMETER_TYPE.String,
      value: 'true',
      description: '',
      keyId: null
    }
  ]
}).trimEnd();

// What the file holds: the columns of a CSV, or a sample of a JSON file.
const ExportContentsSection = ({ format }: { format: Format }) =>
  format.exportOptions === 'columns' ? (
    <ExportSection label="Columns">
      <Typography.Text type="secondary">
        Every {format.label} file has these columns, one row per parameter:
      </Typography.Text>
      <pre className={styles.sample}>{CSV_HEADER.join(',')}</pre>
    </ExportSection>
  ) : (
    <ExportSection label="Contents">
      <Typography.Text type="secondary">
        {format.label} always includes every field Import needs, so the file can
        be loaded back as-is.
      </Typography.Text>
      <pre className={styles.sample}>{JSON_SAMPLE}</pre>
    </ExportSection>
  );

export default ExportContentsSection;
