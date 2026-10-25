import { useState } from 'react';
import { Alert, Button, Card, Flex, Typography, Upload } from 'antd';
import { GlobalOutlined, InboxOutlined } from '@ant-design/icons';
import type { FormatId } from '../../state/export';
import { useImportStore } from '../../state/import';
import { useSettingsStore } from '../../state/settings';
import { uiActions } from '../../state/ui';
import type { ImportFile } from '../../utils/importFile';
import FormatCards from './FormatCards';
import { FORMATS, formatById } from './formats';
import ImportReview from './ImportReview';
import styles from './ImportPanel.module.css';

export interface LoadedFile {
  name: string;
  format: FormatId;
  data: ImportFile;
}

// JSON when it can be imported: it also has the region and export time.
const DEFAULT_FORMAT =
  FORMATS.find(format => format.id === 'json' && format.canImport)?.id ??
  FORMATS.find(format => format.canImport)!.id;

// Every importable extension: a file is read as the format it names.
const ACCEPT = FORMATS.filter(format => format.canImport)
  .map(format => `.${format.id}`)
  .join(',');

// The importable format a file's extension names, if any.
const formatOfFile = (fileName: string) => {
  const extension = fileName.split('.').pop()?.toLowerCase();
  return FORMATS.find(format => format.canImport && format.id === extension);
};

// Step 1 picks a file and checks it; step 2 reviews and imports it. A file
// that isn't a valid export never reaches the review.
const ImportPanel = () => {
  const [formatId, setFormatId] = useState<FormatId>(DEFAULT_FORMAT);
  const [file, setFile] = useState<LoadedFile | null>(null);
  const [error, setError] = useState<string | null>(null);
  const importing = useImportStore(state => state.running);
  const region = useSettingsStore(settings => settings.ssmRegion);
  const format = formatById(formatId);
  const extension = `.${format.id}`;

  // A file is read as the format its extension names, which then shows as
  // picked; otherwise as the picked format.
  const onFile = async (picked: File) => {
    const read = formatOfFile(picked.name) ?? format;
    if (!read.canImport) return;
    setFormatId(read.id);
    const result = read.parse(await picked.text());
    if (result.ok) {
      setFile({ name: picked.name, format: read.id, data: result.file });
      setError(null);
    } else {
      setError(result.error);
    }
  };

  let step;
  if (file) {
    step = <ImportReview file={file} onClose={() => setFile(null)} />;
  } else if (error) {
    step = (
      <Alert
        type="error"
        showIcon
        title={error}
        action={
          <Button type="link" size="small" onClick={() => setError(null)}>
            Choose another file
          </Button>
        }
      />
    );
  } else {
    step = (
      <Upload.Dragger
        accept={ACCEPT}
        multiple={false}
        showUploadList={false}
        // Read here instead of uploaded.
        beforeUpload={picked => {
          void onFile(picked);
          return false;
        }}
      >
        <Flex vertical align="center" gap={4} className={styles.dropZone}>
          <InboxOutlined className={styles.dropIcon} />
          <Typography.Text>
            Drop a {extension} file here, or{' '}
            <Typography.Link>choose a file</Typography.Link>
          </Typography.Text>
          <Typography.Text type="secondary">
            Use a file exported from this app as {format.label}.
          </Typography.Text>
        </Flex>
      </Upload.Dragger>
    );
  }

  return (
    <Flex vertical gap={16}>
      {/* Where the parameters go: the region in Settings, never the file's. */}
      <Alert
        type="info"
        showIcon
        icon={<GlobalOutlined />}
        title={
          <span role="status">
            Parameters are imported into <strong>{region}</strong>.
          </span>
        }
        action={
          <Button
            type="link"
            size="small"
            disabled={importing}
            onClick={() => uiActions.openSettings('aws')}
          >
            Change region
          </Button>
        }
      />
      <Card
        title={
          <Flex vertical>
            Format
            <Typography.Text type="secondary" className={styles.subtitle}>
              The format the file was exported in.
            </Typography.Text>
          </Flex>
        }
      >
        <FormatCards
          mode="import"
          value={formatId}
          onChange={setFormatId}
          disabled={importing || !!file}
        />
      </Card>
      {step}
    </Flex>
  );
};

export default ImportPanel;
