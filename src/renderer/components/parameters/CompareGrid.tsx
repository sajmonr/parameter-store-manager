import { memo, useMemo } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import { Tag, Tooltip, Typography } from 'antd';
import {
  CheckCircleOutlined,
  FolderOpenOutlined,
  FolderOutlined,
  LockOutlined,
  SearchOutlined,
  WarningOutlined
} from '@ant-design/icons';
import type { StructureEnvironment } from '../../../shared/structure';
import type { ParameterEntry } from '../../state/parameters';
import { useParameters } from '../../state/parameters';
import { usePathDelimiter } from '../../state/settings';
import { uiActions, useUiStore } from '../../state/ui';
import { compareRows, isFolderRow } from '../../utils/compare';
import type {
  CompareFilter,
  CompareKey,
  Comparison
} from '../../utils/compare';
import { leafOf } from '../../utils/paths';
import EnvironmentDot from '../common/EnvironmentDot';
import MaskedValue from '../common/MaskedValue';
import Mono from '../common/Mono';
import RevealButton from '../common/RevealButton';
import styles from './CompareGrid.module.css';

const KEY_COLUMN_WIDTH = 300;
const MIN_ENV_COLUMN_WIDTH = 200;

const cx = (...classes: (string | false | null | undefined)[]) =>
  classes.filter(Boolean).join(' ');

interface ValueCellProps {
  env: string;
  parameter: ParameterEntry | undefined;
  unreadable: boolean;
  selected: boolean;
  revealed: boolean;
}

// The key's value in one environment. Clicking it opens the parameter;
// revealing a SecureString doesn't.
const ValueCell = ({
  env,
  parameter,
  unreadable,
  selected,
  revealed
}: ValueCellProps) => {
  if (!parameter) {
    return (
      <div role="cell" className={styles.cell}>
        <Tooltip title={`Not set in ${env}`}>
          <span className={styles.notSet}>Not set</span>
        </Tooltip>
      </div>
    );
  }

  const { Name, Value } = parameter;
  const secure = parameter.Type === 'SecureString';
  let value: ReactNode;
  if (unreadable) {
    value = (
      <Tooltip
        title={
          secure
            ? `Can't decrypt the value in ${env}`
            : `The value in ${env} didn't load`
        }
      >
        <span className={styles.unreadable}>
          {secure ? "Can't decrypt" : 'Not loaded'}
        </span>
      </Tooltip>
    );
  } else {
    // A masked value isn't put in the tooltip either.
    value = (
      <Tooltip title={secure && !revealed ? undefined : Value}>
        <MaskedValue
          value={Value}
          secure={secure}
          revealed={revealed}
          size={13}
          ellipsis
          className={styles.value}
        />
      </Tooltip>
    );
  }

  return (
    <div
      role="cell"
      className={cx(styles.cell, styles.present, selected && styles.selected)}
      onClick={() => uiActions.selectParameter(Name)}
    >
      {value}
      {secure && (
        <span className={styles.secure}>
          <Tooltip title="SecureString">
            <LockOutlined className={styles.lock} aria-label="SecureString" />
          </Tooltip>
          {Value !== undefined && (
            <RevealButton
              revealed={revealed}
              onToggle={() => uiActions.toggleReveal(Name)}
            />
          )}
        </span>
      )}
    </div>
  );
};

interface KeyRowProps {
  row: CompareKey;
  environments: StructureEnvironment[];
  // The open parameter's name when it is one of this key's, otherwise null.
  selectedName: string | null;
  revealed: ReadonlySet<string>;
}

// The key, sticky on the left with its status tags, then its value in each
// environment.
const KeyRow = memo(
  ({ row, environments, selectedName, revealed }: KeyRowProps) => {
    const delimiter = usePathDelimiter();
    const { key, folder, cells, missing, unreadable, differs } = row;
    return (
      <div role="row" className={styles.row}>
        <div
          role="rowheader"
          className={cx(
            styles.keyCell,
            folder && styles.indented,
            selectedName && styles.selectedKey
          )}
        >
          <Tooltip title={key}>
            <Mono size={13} weight={600} ellipsis className={styles.keyName}>
              {leafOf(key, delimiter)}
            </Mono>
          </Tooltip>
          <span className={styles.tags}>
            {unreadable.length > 0 && (
              <Tooltip
                title={`Can't read the value in ${unreadable.join(', ')}, so it isn't compared`}
              >
                <WarningOutlined
                  className={styles.warning}
                  aria-label="Not compared"
                />
              </Tooltip>
            )}
            {differs && (
              <Tooltip title="Values aren't the same in every environment">
                <Tag color="gold" className={styles.tag}>
                  Differs
                </Tag>
              </Tooltip>
            )}
            {missing.length > 0 && (
              <Tooltip title={`Not set in ${missing.join(', ')}`}>
                <Tag color="red" className={styles.tag}>
                  Missing
                </Tag>
              </Tooltip>
            )}
          </span>
        </div>
        {environments.map(({ segment }) => {
          const parameter = cells.get(segment);
          return (
            <ValueCell
              key={segment}
              env={segment}
              parameter={parameter}
              unreadable={unreadable.includes(segment)}
              selected={!!parameter && parameter.Name === selectedName}
              revealed={!!parameter && revealed.has(parameter.Name)}
            />
          );
        })}
      </div>
    );
  }
);
KeyRow.displayName = 'KeyRow';

const EmptyState = ({ icon, text }: { icon: ReactNode; text: string }) => (
  <div className={styles.empty}>
    <span className={styles.emptyIcon}>{icon}</span>
    <Typography.Text type="secondary">{text}</Typography.Text>
  </div>
);

// Why the filter lists nothing.
const emptyStateOf = (comparison: Comparison, filter: CompareFilter) => {
  if (!comparison.total) {
    return (
      <EmptyState icon={<FolderOpenOutlined />} text="No keys in this folder" />
    );
  }
  if (!comparison.keys.length) {
    return (
      <EmptyState icon={<SearchOutlined />} text="No keys match the search" />
    );
  }
  return (
    <EmptyState
      icon={<CheckCircleOutlined />}
      text={
        filter === 'differs'
          ? 'Every key has the same value in each environment'
          : 'Every key is set in each environment'
      }
    />
  );
};

interface CompareGridProps {
  comparison: Comparison;
  // The keys the filter lists.
  keys: CompareKey[];
}

// The service's keys under the folder, one column per environment. The
// header row and the key column stay put while the values scroll; the
// columns never get narrower than 200px, so many environments scroll
// sideways.
const CompareGrid = ({ comparison, keys }: CompareGridProps) => {
  const selectedName = useUiStore(state => state.selectedName);
  const revealed = useUiStore(state => state.revealed);
  const filter = useUiStore(state => state.compareFilter);
  const delimiter = usePathDelimiter();
  const { loading } = useParameters();
  const rows = useMemo(() => compareRows(keys), [keys]);
  const { environments } = comparison;

  // Like the filter's counts: the keys matching the search, before the
  // filter.
  const counts = useMemo(
    () =>
      environments.map(
        ({ segment }) =>
          comparison.keys.filter(key => key.cells.has(segment)).length
      ),
    [comparison, environments]
  );

  if (!keys.length) return emptyStateOf(comparison, filter);

  const style = {
    '--compare-columns': `${KEY_COLUMN_WIDTH}px repeat(${environments.length}, minmax(${MIN_ENV_COLUMN_WIDTH}px, 1fr))`,
    minWidth: KEY_COLUMN_WIDTH + MIN_ENV_COLUMN_WIDTH * environments.length
  } as CSSProperties;

  return (
    <div className={styles.scroll}>
      <div
        role="table"
        aria-label="Compare environments"
        aria-busy={loading}
        className={styles.grid}
        style={style}
      >
        <div role="row" className={cx(styles.row, styles.headerRow)}>
          <div role="columnheader" className={styles.keyCell}>
            Key
          </div>
          {environments.map(({ segment, color }, index) => (
            <div key={segment} role="columnheader" className={styles.cell}>
              <EnvironmentDot color={color} />
              <span className={styles.envName}>{segment}</span>
              <span className={styles.envCount}>{counts[index]}</span>
            </div>
          ))}
        </div>
        {rows.map(row => {
          if (isFolderRow(row)) {
            return (
              <div key={row.id} role="row" className={styles.folderRow}>
                <span className={styles.folderLabel}>
                  <FolderOutlined />
                  <Mono size={13}>
                    {row.folder.slice(0, -delimiter.length)}
                  </Mono>
                  <span className={styles.envCount}>{row.count}</span>
                </span>
              </div>
            );
          }
          const own = [...row.cells.values()].some(
            p => p.Name === selectedName
          );
          return (
            <KeyRow
              key={row.key}
              row={row}
              environments={environments}
              selectedName={own ? selectedName : null}
              revealed={revealed}
            />
          );
        })}
      </div>
    </div>
  );
};

export default CompareGrid;
