import { useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Alert, Button, Card, Flex, Typography } from 'antd';
import { CloseOutlined } from '@ant-design/icons';
import { importActions, useImportStore } from '../../state/import';
import { refreshParameters, useParameters } from '../../state/parameters';
import { useSettingsStore } from '../../state/settings';
import { countStatuses, isWritten, planImport } from '../../utils/importPlan';
import type { ImportRow, ImportStatus } from '../../utils/importPlan';
import { plural } from '../../utils/plural';
import type { LoadedFile } from './ImportPanel';
import styles from './ImportReview.module.css';
import { STATUSES } from './review/importStatuses';
import ReviewFooter from './review/ReviewFooter';
import ReviewHeader from './review/ReviewHeader';
import ReviewRow from './review/ReviewRow';
import StatFilter from './review/StatFilter';
import { notifySuccess } from '../../utils/notify';
import LabeledSwitch from '../common/LabeledSwitch';

interface RunResult {
  written: number;
  total: number;
}

// Step 2 of an import: what the file would change, compared with the loaded
// parameters, and the import itself. After a partial failure it stays open,
// with the failed rows marked, so they can be retried.
const ImportReview = ({
  file,
  onClose
}: {
  file: LoadedFile;
  onClose: () => void;
}) => {
  const client = useQueryClient();
  const { byName, loading } = useParameters();
  const region = useSettingsStore(settings => settings.ssmRegion);
  const importing = useImportStore(state => state.running);
  const done = useImportStore(state => state.done);
  const total = useImportStore(state => state.total);
  const [overwrite, setOverwrite] = useState(false);
  // The AWS error of each entry the last run failed to write, by name.
  const [failed, setFailed] = useState<ReadonlyMap<string, string>>(new Map());
  const [lastRun, setLastRun] = useState<RunResult | null>(null);
  // The status the list is narrowed to, picked by clicking its count. Only
  // what is shown changes, not what is imported.
  const [shown, setShown] = useState<ImportStatus | null>(null);

  const { parameters } = file.data;
  // Written entries show as unchanged once the run has saved them.
  const rows = useMemo(
    () => planImport(parameters, byName),
    [parameters, byName]
  );
  const counts = countStatuses(rows);
  const toWrite = rows.filter(row => isWritten(row.status, overwrite));
  const retryable = toWrite.filter(row => failed.has(row.entry.name));
  const listed = shown ? rows.filter(row => row.status === shown) : rows;
  const fileRegion = file.data.region;

  const run = async (selected: ImportRow[]) => {
    setFailed(new Map());
    setLastRun(null);
    const result = await importActions.run(
      client,
      selected.map(({ entry, status }) => ({
        entry,
        overwrite: status === 'changed'
      }))
    );
    if (!result.failed.size) {
      notifySuccess(`Imported ${plural(result.written.length, 'parameter')}`);
      void refreshParameters(client);
      onClose();
      return;
    }
    setFailed(result.failed);
    setLastRun({ written: result.written.length, total: selected.length });
  };

  return (
    <Card
      title={<ReviewHeader file={file} />}
      extra={
        <Button
          type="text"
          icon={<CloseOutlined />}
          aria-label="Close file"
          disabled={importing}
          onClick={onClose}
        />
      }
    >
      <Flex vertical gap="middle">
        <StatFilter counts={counts} shown={shown} onShow={setShown} />
        {fileRegion && fileRegion !== region && (
          <Alert
            type="info"
            showIcon
            title={`This file was exported from ${fileRegion}. Parameters will be imported into ${region}.`}
          />
        )}
        <ul className={styles.list} aria-label="Parameters in the file">
          {shown && !listed.length && (
            <li className={styles.empty}>
              <Typography.Text type="secondary">
                No parameters are {STATUSES[shown].label} now.
              </Typography.Text>
            </li>
          )}
          {listed.map(row => (
            <ReviewRow
              key={row.entry.name}
              row={row}
              written={isWritten(row.status, overwrite)}
              error={failed.get(row.entry.name)}
            />
          ))}
        </ul>
        <Flex vertical gap="var(--ant-margin-xxs)">
          <LabeledSwitch
            id="import-overwrite"
            checked={overwrite}
            disabled={importing}
            onChange={setOverwrite}
          >
            Overwrite parameters that already exist with a different value
          </LabeledSwitch>
          <Typography.Text type="secondary" className={styles.hint}>
            Overwriting creates a new version. Unchanged parameters are always
            skipped.
          </Typography.Text>
        </Flex>
        <ReviewFooter
          toWrite={toWrite.length}
          lastRun={failed.size > 0 ? lastRun : null}
          retryable={retryable.length}
          importing={importing}
          progress={{ done, total }}
          loading={loading}
          onImport={() => run(toWrite)}
          onRetry={() => run(retryable)}
          onCancel={onClose}
        />
      </Flex>
    </Card>
  );
};

export default ImportReview;
