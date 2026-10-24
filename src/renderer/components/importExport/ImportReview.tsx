import { useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  Alert,
  App,
  Button,
  Card,
  Flex,
  Switch,
  Tag,
  Tooltip,
  Typography
} from 'antd';
import { CloseOutlined, LockOutlined } from '@ant-design/icons';
import {
  importActions,
  importDuration,
  SLOW_IMPORT_WRITES,
  useImportStore
} from '../../state/import';
import { refreshParameters, useParameters } from '../../state/parameters';
import { useSettingsStore } from '../../state/settings';
import { countStatuses, isWritten, planImport } from '../../utils/importPlan';
import type { ImportRow, ImportStatus } from '../../utils/importPlan';
import { plural } from '../../utils/plural';
import Mono from '../common/Mono';
import { formatById } from './formats';
import type { LoadedFile } from './ImportPanel';
import styles from './ImportReview.module.css';

interface StatusStyle {
  label: string;
  color?: string;
  // Explains a status that isn't obvious.
  tooltip?: string;
}

const STATUSES: Record<ImportStatus, StatusStyle> = {
  new: { label: 'new', color: 'green' },
  changed: { label: 'changed', color: 'gold' },
  unchanged: { label: 'unchanged' },
  skipped: {
    label: 'skipped',
    tooltip: 'Exported without decryption, so the file has no value.'
  },
  typeChange: {
    label: 'type change',
    tooltip:
      "It exists with another type. Changing between String and SecureString isn't supported yet."
  },
  unsupported: {
    label: 'unsupported',
    tooltip: "StringList parameters can't be imported yet."
  }
};

// The statuses counted in the stats row; the last three only when present.
const STAT_ORDER: ImportStatus[] = [
  'new',
  'changed',
  'unchanged',
  'skipped',
  'typeChange',
  'unsupported'
];
const ALWAYS_COUNTED = new Set<ImportStatus>(['new', 'changed', 'unchanged']);

// null when the file doesn't say, as in a CSV.
const exportedOn = (exportedAt: string | null) => {
  if (!exportedAt) return null;
  const date = new Date(exportedAt);
  return Number.isNaN(date.getTime())
    ? null
    : date.toLocaleString(undefined, {
        dateStyle: 'medium',
        timeStyle: 'short'
      });
};

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
  const { notification } = App.useApp();
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

  const { parameters, exportedAt } = file.data;
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
  const meta = [
    plural(parameters.length, 'parameter'),
    exportedOn(exportedAt) && `exported ${exportedOn(exportedAt)}`,
    fileRegion
  ].filter(Boolean);

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
      notification.success({
        title: `Imported ${plural(result.written.length, 'parameter')}`
      });
      void refreshParameters(client);
      onClose();
      return;
    }
    setFailed(result.failed);
    setLastRun({ written: result.written.length, total: selected.length });
  };

  let importLabel: string;
  if (importing) {
    importLabel = `Importing ${done.toLocaleString()} of ${total.toLocaleString()}…`;
  } else if (toWrite.length) {
    importLabel = `Import ${plural(toWrite.length, 'parameter')}`;
  } else {
    importLabel = 'Nothing to import';
  }

  return (
    <Card
      title={
        <Flex align="center" gap={10}>
          <span className={styles.fileIcon}>
            {formatById(file.format).icon}
          </span>
          <Flex vertical className={styles.fileTitle}>
            <Mono ellipsis={{ tooltip: file.name }}>{file.name}</Mono>
            <Typography.Text type="secondary" className={styles.meta}>
              {meta.join(' · ')}
            </Typography.Text>
          </Flex>
        </Flex>
      }
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
      <Flex vertical gap={16}>
        <Flex gap={8} wrap role="group" aria-label="Summary">
          {STAT_ORDER.filter(
            status => ALWAYS_COUNTED.has(status) || counts[status]
          ).map(status => {
            const active = shown === status;
            const classes = [styles.statButton];
            if (shown && !active) classes.push(styles.statInactive);
            return (
              <Tooltip key={status} title={STATUSES[status].tooltip}>
                <button
                  type="button"
                  className={classes.join(' ')}
                  aria-pressed={active}
                  // A status that has gone to 0 can still be turned off.
                  disabled={!counts[status] && !active}
                  onClick={() => setShown(active ? null : status)}
                >
                  <Tag color={STATUSES[status].color} className={styles.stat}>
                    {counts[status].toLocaleString()} {STATUSES[status].label}
                  </Tag>
                </button>
              </Tooltip>
            );
          })}
        </Flex>
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
        <Flex vertical gap={4}>
          <Flex align="center" gap={8}>
            <Switch
              id="import-overwrite"
              checked={overwrite}
              disabled={importing}
              onChange={setOverwrite}
            />
            <label htmlFor="import-overwrite">
              Overwrite parameters that already exist with a different value
            </label>
          </Flex>
          <Typography.Text type="secondary" className={styles.hint}>
            Overwriting creates a new version. Unchanged parameters are always
            skipped.
          </Typography.Text>
        </Flex>
        {toWrite.length >= SLOW_IMPORT_WRITES && !importing && (
          <Alert
            type="warning"
            showIcon
            title={`This import writes ${plural(toWrite.length, 'parameter')}, which takes ${importDuration(toWrite.length)}.`}
            description="AWS limits writes to 3 per second for the whole account, and you can't leave this page until it finishes."
          />
        )}
        {lastRun && failed.size > 0 && !importing && (
          <Alert
            type="error"
            showIcon
            title={`Imported ${lastRun.written.toLocaleString()} of ${lastRun.total.toLocaleString()}. ${failed.size.toLocaleString()} failed.`}
            action={
              <Button
                size="small"
                disabled={!retryable.length || loading}
                onClick={() => run(retryable)}
              >
                Retry failed
              </Button>
            }
          />
        )}
        <Flex justify="flex-end" align="center" gap={8}>
          {loading && !importing && (
            <Typography.Text type="secondary" className={styles.status}>
              Waiting for parameters to finish loading…
            </Typography.Text>
          )}
          <Button disabled={importing} onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="primary"
            loading={importing}
            disabled={!toWrite.length || loading}
            onClick={() => run(toWrite)}
          >
            {importLabel}
          </Button>
        </Flex>
      </Flex>
    </Card>
  );
};

// One entry of the file. Entries that won't be written are dimmed; failed
// ones show the AWS error on hover.
const ReviewRow = ({
  row: { entry, status },
  written,
  error
}: {
  row: ImportRow;
  written: boolean;
  error?: string;
}) => {
  const { label, color, tooltip } = STATUSES[status];
  const classes = [styles.row];
  if (!written) classes.push(styles.dimmed);
  const content = (
    <li className={classes.join(' ')}>
      <span className={styles.statusColumn}>
        {error ? (
          <Tag color="red">failed</Tag>
        ) : (
          <Tooltip title={tooltip}>
            <Tag color={color}>{label}</Tag>
          </Tooltip>
        )}
      </span>
      <Mono
        ellipsis
        className={styles.name}
        type={error ? 'danger' : undefined}
      >
        {entry.name}
      </Mono>
      {entry.type === 'SecureString' && (
        <LockOutlined aria-label="SecureString" className={styles.lock} />
      )}
    </li>
  );
  return error ? <Tooltip title={error}>{content}</Tooltip> : content;
};

export default ImportReview;
