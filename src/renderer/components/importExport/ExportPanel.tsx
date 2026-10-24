import { useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import {
  Alert,
  AutoComplete,
  Button,
  Card,
  Flex,
  Input,
  Progress,
  Radio,
  Switch,
  Typography
} from 'antd';
import { FolderOutlined } from '@ant-design/icons';
import {
  describeProgress,
  exportActions,
  exportsType,
  useExportStore
} from '../../state/export';
import type { FormatId } from '../../state/export';
import { useParameters } from '../../state/parameters';
import { usePathDelimiter, useSettingsStore } from '../../state/settings';
import { useAllFolderTree, useLocationPath } from '../../state/views';
import useDebouncedValue from '../../hooks/useDebouncedValue';
import usePageVisible from '../../hooks/usePageVisible';
import { CSV_HEADER } from '../../utils/csv';
import { foldersOf, rootFolder } from '../../utils/paths';
import { plural } from '../../utils/plural';
import { createPathMatcher, createPrefixMatcher } from '../../utils/search';
import Mono from '../common/Mono';
import FormatCards from './FormatCards';
import { formatById } from './formats';
import styles from './ExportPanel.module.css';

type Scope = 'all' | 'path';

// The count waits until typing pauses, so it doesn't flicker.
const COUNT_DEBOUNCE_MS = 250;
const MAX_SUGGESTIONS = 20;
const PREVIEW_SIZE = 5;

// The shape of a JSON export, shown instead of column options.
const JSON_SAMPLE = `{
  "format": "parameter-store-manager",
  "version": 1,
  "exportedAt": "2026-10-14T09:12:00Z",
  "region": "us-east-1",
  "decrypted": true,
  "parameters": [
    {
      "name": "/app/prod/Enabled",
      "type": "String",
      "value": "true",
      "description": "",
      "keyId": null
    }
  ]
}`;

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

// Everything under a folder: /app/prod/** for /app/prod/, /** at the root.
const globUnder = (folder: string, delimiter: string) =>
  `${folder || rootFolder(delimiter)}**`;

// Exports parameters to a file. The count is a preview from the loaded
// parameters; the export itself reads AWS and keeps running when the page is
// left. Each time the page is shown, the scope starts over from the current
// folder, unless an export is running. The format stays the last one used.
const ExportPanel = () => {
  const { parameters, loading } = useParameters();
  const { keys: folders } = useAllFolderTree();
  const delimiter = usePathDelimiter();
  const region = useSettingsStore(settings => settings.ssmRegion);
  const initialPath = globUnder(useLocationPath(), delimiter);
  const visible = usePageVisible();
  const exporting = useExportStore(state => state.running);
  const progress = useExportStore(state => state.progress);

  const [formatId, setFormatId] = useState<FormatId>('csv');
  const [scope, setScope] = useState<Scope>('path');
  const [path, setPath] = useState(initialPath);
  const [includeSecureValues, setIncludeSecureValues] = useState(false);
  const debouncedPath = useDebouncedValue(path, COUNT_DEBOUNCE_MS);
  const format = formatById(formatId);
  const byPath = scope === 'path';
  const typing = byPath && path !== debouncedPath;
  const saving = progress?.phase === 'saving';

  const [wasVisible, setWasVisible] = useState(visible);
  if (visible !== wasVisible) {
    setWasVisible(visible);
    if (visible && !exporting) {
      setScope('path');
      setPath(initialPath);
      setIncludeSecureValues(false);
    }
  }

  const exportable = useMemo(
    () => parameters.filter(p => exportsType(formatId, p.Type)),
    [formatId, parameters]
  );
  const matched = useMemo(() => {
    const matcher = createPathMatcher(debouncedPath, delimiter);
    return exportable.filter(p => matcher.test(p.Name));
  }, [debouncedPath, delimiter, exportable]);
  const selected = byPath ? matched : exportable;

  const suggestions = useMemo(
    () =>
      suggestFolders(folders, path, delimiter).map(folder => ({
        value: folder,
        label: <span className={styles.mono}>{folder}</span>
      })),
    [folders, path, delimiter]
  );

  const pathMissing = byPath && !path.trim();
  const canExport =
    !exporting && !loading && !typing && !pathMissing && selected.length > 0;

  const onExport = () =>
    exportActions.start({
      format: formatId,
      path: byPath ? path.trim() : '',
      includeSecureValues
    });

  let status: string | null = null;
  if (progress) status = describeProgress(progress);
  else if (loading) status = 'Waiting for parameters to finish loading…';
  else if (typing) status = 'Counting…';

  const pathOption = (
    <div
      className={`${styles.option} ${byPath ? styles.optionSelected : ''}`}
      onClick={() => !exporting && setScope('path')}
    >
      <Radio value="path">Path or glob</Radio>
      <div className={styles.optionBody}>
        <AutoComplete
          value={path}
          onChange={setPath}
          onFocus={() => setScope('path')}
          options={suggestions}
          disabled={exporting}
          // Each pick narrows the suggestions to its subfolders.
          defaultActiveFirstOption={false}
        >
          <Input
            aria-label="Path or glob"
            placeholder={globUnder('', delimiter)}
            prefix={<FolderOutlined />}
            className={styles.mono}
            allowClear
          />
        </AutoComplete>
        {byPath && !pathMissing && !typing && !loading && (
          <PathPreview names={matched.map(p => p.Name)} />
        )}
        <Typography.Text type="secondary" className={styles.hint}>
          A path exports everything under it. <code>*</code> matches one
          segment, <code>**</code> any depth.
        </Typography.Text>
      </div>
    </div>
  );

  const allOption = (
    <div
      className={`${styles.option} ${byPath ? '' : styles.optionSelected}`}
      onClick={() => !exporting && setScope('all')}
    >
      <Radio value="all">All parameters</Radio>
      <Typography.Text type="secondary" className={styles.optionBody}>
        {plural(exportable.length, 'parameter')} · Every path in {region}
      </Typography.Text>
    </div>
  );

  return (
    <Flex vertical gap={16}>
      <Card title="Format">
        <FormatCards
          mode="export"
          value={formatId}
          onChange={setFormatId}
          disabled={exporting}
        />
      </Card>
      <Card
        title="What to export"
        extra={
          !loading && !typing && !pathMissing ? (
            <Typography.Text type="secondary" role="status">
              {plural(selected.length, 'parameter')}
            </Typography.Text>
          ) : null
        }
      >
        <Flex vertical gap={20}>
          <Section label="Parameters">
            <Radio.Group
              value={scope}
              disabled={exporting}
              onChange={event => setScope(event.target.value as Scope)}
              className={styles.options}
            >
              {pathOption}
              {allOption}
            </Radio.Group>
          </Section>
          {format.exportOptions === 'columns' ? (
            <Section label="Columns">
              <Typography.Text type="secondary">
                Every {format.label} file has these columns, one row per
                parameter:
              </Typography.Text>
              <pre className={styles.sample}>{CSV_HEADER.join(',')}</pre>
            </Section>
          ) : (
            <Section label="Contents">
              <Typography.Text type="secondary">
                {format.label} always includes every field Import needs, so the
                file can be loaded back as-is.
              </Typography.Text>
              <pre className={styles.sample}>{JSON_SAMPLE}</pre>
            </Section>
          )}
          <Flex vertical gap={12}>
            <Flex align="center" gap={8}>
              <Switch
                id="export-decrypt"
                checked={includeSecureValues}
                disabled={exporting}
                onChange={setIncludeSecureValues}
              />
              <label htmlFor="export-decrypt">
                Decrypt SecureString values
              </label>
            </Flex>
            {includeSecureValues && (
              <Alert
                type="warning"
                showIcon
                title="SecureString values are exported as plain text"
                description="The file holds decrypted secrets. Keep it somewhere safe and delete it when you no longer need it."
              />
            )}
            {!includeSecureValues && format.canImport && (
              <Alert
                type="info"
                showIcon
                title="Without decryption, SecureString values are left out of the file. Those parameters will be skipped on import."
              />
            )}
          </Flex>
        </Flex>
      </Card>
      <Flex vertical gap={8}>
        {progress?.phase === 'values' && (
          <Progress
            percent={
              progress.total ? (progress.done / progress.total) * 100 : 100
            }
            showInfo={false}
            size="small"
          />
        )}
        <Flex justify="flex-end" align="center" gap={8}>
          {status && (
            <Typography.Text type="secondary" className={styles.status}>
              {status}
            </Typography.Text>
          )}
          {/* Once the file is being saved, the export can't be stopped. */}
          {exporting && (
            <Button onClick={exportActions.cancel} disabled={saving}>
              Cancel
            </Button>
          )}
          <Button
            type="primary"
            disabled={!canExport && !exporting}
            loading={exporting}
            onClick={onExport}
          >
            Export {plural(selected.length, 'parameter')} as {format.label}
          </Button>
        </Flex>
      </Flex>
    </Flex>
  );
};

// A labelled part of the "What to export" card.
const Section = ({
  label,
  children
}: {
  label: string;
  children: ReactNode;
}) => (
  <Flex vertical gap={8}>
    <Typography.Text strong>{label}</Typography.Text>
    {children}
  </Flex>
);

// The first few names the path matches.
const PathPreview = ({ names }: { names: string[] }) => {
  if (!names.length) {
    return (
      <Typography.Text type="warning">
        No parameters match this path.
      </Typography.Text>
    );
  }
  const rest = names.length - PREVIEW_SIZE;
  return (
    <ul className={styles.preview} aria-label="Matching parameters">
      {names.slice(0, PREVIEW_SIZE).map(name => (
        <li key={name}>
          <Mono ellipsis={{ tooltip: name }} className={styles.previewName}>
            {name}
          </Mono>
        </li>
      ))}
      {rest > 0 && (
        <li>
          <Typography.Text type="secondary">
            and {rest.toLocaleString()} more
          </Typography.Text>
        </li>
      )}
    </ul>
  );
};

export default ExportPanel;
