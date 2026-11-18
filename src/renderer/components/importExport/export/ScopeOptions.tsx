import { AutoComplete, Input, Radio, Typography, Flex } from 'antd';
import { FolderOutlined } from '@ant-design/icons';
import { usePathDelimiter, useSettingsStore } from '../../../state/settings';
import { cx } from '../../../utils/classNames';
import { plural } from '../../../utils/plural';
import { globUnder } from '../../../utils/search';
import PathPreview from './PathPreview';
import type { Scope } from './useExportForm';
import styles from '../ExportPanel.module.css';

interface ScopeOptionsProps {
  scope: Scope;
  onScope: (scope: Scope) => void;
  path: string;
  onPath: (path: string) => void;
  // Folders to complete the path with.
  suggestions: string[];
  // The names the path matches, once the count is settled; null before.
  matched: string[] | null;
  // How many parameters "All parameters" exports.
  total: number;
  disabled: boolean;
}

// What to export: the parameters under a path or glob, or all of them.
const ScopeOptions = ({
  scope,
  onScope,
  path,
  onPath,
  suggestions,
  matched,
  total,
  disabled
}: ScopeOptionsProps) => {
  const delimiter = usePathDelimiter();
  const region = useSettingsStore(settings => settings.ssmRegion);
  const byPath = scope === 'path';
  return (
    <Radio.Group
      value={scope}
      disabled={disabled}
      onChange={event => onScope(event.target.value as Scope)}
      className={styles.options}
    >
      <Flex vertical gap="small">
        <Flex
          vertical
          gap="small"
          className={cx(styles.option, byPath && styles.optionSelected)}
          onClick={() => !disabled && onScope('path')}
        >
          <Radio value="path">Path or glob</Radio>
          <Flex vertical gap="small" className={styles.optionBody}>
            <AutoComplete
              value={path}
              onChange={onPath}
              onFocus={() => onScope('path')}
              options={suggestions.map(folder => ({
                value: folder,
                label: <span className={styles.mono}>{folder}</span>
              }))}
              disabled={disabled}
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
            {byPath && matched && <PathPreview names={matched} />}
            <Typography.Text type="secondary" className={styles.hint}>
              A path exports everything under it. <code>*</code> matches one
              segment, <code>**</code> any depth.
            </Typography.Text>
          </Flex>
        </Flex>
        <Flex
          vertical
          gap="small"
          className={cx(styles.option, !byPath && styles.optionSelected)}
          onClick={() => !disabled && onScope('all')}
        >
          <Radio value="all">All parameters</Radio>
          <Typography.Text type="secondary" className={styles.optionBody}>
            {plural(total, 'parameter')} · Every path in {region}
          </Typography.Text>
        </Flex>
      </Flex>
    </Radio.Group>
  );
};

export default ScopeOptions;
