import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  App,
  AutoComplete,
  Button,
  Checkbox,
  Flex,
  Input,
  Progress,
  Radio,
  Typography
} from 'antd';
import { describeError } from '../../utils/awsErrors';
import type { ApiError } from '../../clients/call';
import { useExportParameters } from '../../state/export';
import type { ExportProgress } from '../../state/export';
import { useParameters } from '../../state/parameters';
import { usePathDelimiter } from '../../state/settings';
import { useUiStore } from '../../state/ui';
import { useAllFolderTree } from '../../state/views';
import useDebouncedValue from '../../hooks/useDebouncedValue';
import { foldersOf } from '../../utils/paths';
import { createPrefixMatcher } from '../../utils/search';
import styles from './ExportForm.module.css';

type Scope = 'all' | 'path';

// The count waits until typing pauses, so it doesn't flicker.
const COUNT_DEBOUNCE_MS = 250;
const MAX_SUGGESTIONS = 20;

const plural = (count: number, word: string) =>
  `${count.toLocaleString()} ${word}${count === 1 ? '' : 's'}`;

// Folders under what was typed, shallowest first, so the next level down is
// at the top of the list.
const suggestFolders = (folders: string[], path: string, delimiter: string) => {
  const matcher = createPrefixMatcher(path, delimiter);
  return folders
    .filter(folder => folder !== matcher.query && matcher.test(folder))
    .map(folder => ({ folder, depth: foldersOf(folder, delimiter).length }))
    .sort((a, b) => a.depth - b.depth || a.folder.localeCompare(b.folder))
    .slice(0, MAX_SUGGESTIONS)
    .map(({ folder }) => folder);
};

const progressText = (progress: ExportProgress) => {
  if (progress.phase === 'listing') {
    return `Listing parameters… ${progress.found.toLocaleString()} found`;
  }
  if (progress.phase === 'values') {
    return `Fetching values… ${progress.done.toLocaleString()} / ${progress.total.toLocaleString()}`;
  }
  return 'Saving…';
};

// Exports all parameters, or those under a path, to a CSV file. The count is
// a preview from the loaded parameters; the export itself reads AWS. Starts
// with the scoped folder as the path.
const ExportForm = ({
  onClose,
  onSavingChange
}: {
  onClose: () => void;
  onSavingChange: (saving: boolean) => void;
}) => {
  const { message, notification } = App.useApp();
  const { parameters, loading } = useParameters();
  const { keys: folders } = useAllFolderTree();
  const delimiter = usePathDelimiter();
  const initialPath = useUiStore(state => state.scope);
  const exportParameters = useExportParameters();

  const [scope, setScope] = useState<Scope>(initialPath ? 'path' : 'all');
  const [path, setPath] = useState(initialPath);
  const [includeSecureValues, setIncludeSecureValues] = useState(false);
  const [progress, setProgress] = useState<ExportProgress | null>(null);
  const debouncedPath = useDebouncedValue(path, COUNT_DEBOUNCE_MS);
  const byPath = scope === 'path';
  const typing = byPath && path !== debouncedPath;
  const exporting = exportParameters.isPending;
  const saving = progress?.phase === 'saving';
  useEffect(() => onSavingChange(saving), [onSavingChange, saving]);

  // Closing the modal stops a running export.
  const abortRef = useRef<AbortController | null>(null);
  useEffect(() => () => abortRef.current?.abort(), []);

  const selected = useMemo(() => {
    if (!byPath) return parameters;
    const matcher = createPrefixMatcher(debouncedPath, delimiter);
    return parameters.filter(p => matcher.test(p.Name));
  }, [byPath, debouncedPath, delimiter, parameters]);
  const secureCount = selected.filter(p => p.Type === 'SecureString').length;

  const suggestions = useMemo(
    () =>
      suggestFolders(folders, path, delimiter).map(folder => ({
        value: folder,
        label: <span className={styles.option}>{folder}</span>
      })),
    [folders, path, delimiter]
  );

  const pathMissing = byPath && !path.trim();
  const canExport =
    !exporting && !loading && !typing && !pathMissing && selected.length > 0;

  const onExport = () => {
    const controller = new AbortController();
    abortRef.current = controller;
    exportParameters.mutate(
      {
        path: byPath ? path.trim() : '',
        includeSecureValues,
        signal: controller.signal,
        onProgress: next => {
          if (!controller.signal.aborted) setProgress(next);
        }
      },
      {
        onSuccess: ({ filePath, count }) => {
          setProgress(null);
          // Cancelling the save dialog keeps the form open.
          if (!filePath) return;
          message.success(`Exported ${plural(count, 'parameter')}`);
          onClose();
        },
        onError: error => {
          setProgress(null);
          if (controller.signal.aborted) return;
          notification.error({
            title: 'Parameters were not exported',
            description: describeError(error as ApiError)
          });
        }
      }
    );
  };

  // While exporting, Cancel stops the export and keeps the form open.
  const onCancel = () => {
    if (!exporting) {
      onClose();
      return;
    }
    abortRef.current?.abort();
    setProgress(null);
    exportParameters.reset();
  };

  let status: string;
  if (progress) status = progressText(progress);
  else if (loading) status = 'Waiting for parameters to finish loading…';
  else if (pathMissing) status = 'Enter a path.';
  else if (typing) status = 'Counting…';
  else if (!selected.length) status = 'No parameters match.';
  else {
    status = `${plural(selected.length, 'parameter')} match`;
    if (secureCount) {
      status += `, ${secureCount.toLocaleString()} of them SecureString`;
    }
    status += '.';
  }

  return (
    <Flex vertical gap={16}>
      <Radio.Group
        value={scope}
        disabled={exporting}
        onChange={event => setScope(event.target.value as Scope)}
        options={[
          { value: 'all', label: 'All parameters' },
          { value: 'path', label: 'By path' }
        ]}
      />
      {byPath && (
        <Flex vertical gap={4}>
          <AutoComplete
            value={path}
            onChange={setPath}
            options={suggestions}
            disabled={exporting}
            // Each pick narrows the suggestions to its subfolders.
            defaultActiveFirstOption={false}
          >
            <Input
              aria-label="Path"
              placeholder={`${delimiter}app${delimiter}prod${delimiter} or ${delimiter}app${delimiter}*${delimiter}db`}
              className={styles.path}
              autoFocus
              allowClear
            />
          </AutoComplete>
          <Typography.Text type="secondary" className={styles.hint}>
            Names starting with this. Use * and ** as wildcards.
          </Typography.Text>
        </Flex>
      )}
      <Flex vertical gap={4}>
        <Typography.Text
          type="secondary"
          className={styles.status}
          role="status"
        >
          {status}
        </Typography.Text>
        {progress?.phase === 'values' && (
          <Progress
            percent={
              progress.total ? (progress.done / progress.total) * 100 : 100
            }
            showInfo={false}
            size="small"
          />
        )}
      </Flex>
      <Checkbox
        checked={includeSecureValues}
        disabled={exporting}
        onChange={event => setIncludeSecureValues(event.target.checked)}
      >
        Include SecureString values
      </Checkbox>
      {includeSecureValues && (
        <Alert
          type="warning"
          showIcon
          title="SecureString values are exported as plain text"
          description="The file holds decrypted secrets. Keep it somewhere safe and delete it when you no longer need it."
        />
      )}
      <Flex justify="flex-end" gap={8}>
        <Button onClick={onCancel} disabled={saving}>
          Cancel
        </Button>
        <Button
          type="primary"
          disabled={!canExport && !exporting}
          loading={exporting}
          onClick={onExport}
        >
          Export
        </Button>
      </Flex>
    </Flex>
  );
};

export default ExportForm;
