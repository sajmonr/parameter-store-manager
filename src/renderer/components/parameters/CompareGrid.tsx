import { memo, useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { CSSProperties, ReactNode } from 'react';
import { Alert, Button, Tag, Tooltip, Typography } from 'antd';
import {
  CheckCircleOutlined,
  FolderOpenOutlined,
  FolderOutlined,
  RetweetOutlined,
  SearchOutlined,
  WarningOutlined
} from '@ant-design/icons';
import type { StructureEnvironment } from '../../../shared/structure';
import { isSecure } from '../../../shared/parameterTypes';
import type { ParameterEntry } from '../../state/parameters';
import { refreshParameters, useParameters } from '../../state/parameters';
import { usePathDelimiter } from '../../state/settings';
import { uiActions, useUiStore } from '../../state/ui';
import {
  compareRows,
  copyBlockReason,
  copySourceOf,
  countsByEnvironment,
  emptyReasonOf,
  isFolderRow,
  rowHas
} from '../../utils/compare';
import type {
  CompareFilter,
  CompareKey,
  Comparison,
  EmptyReason
} from '../../utils/compare';
import { leafOf } from '../../utils/paths';
import CopyButton from '../common/CopyButton';
import CompareProgress from './CompareProgress';
import NotSetCell from './NotSetCell';
import MaskedValue from '../common/MaskedValue';
import Mono from '../common/Mono';
import RevealButton from '../common/RevealButton';
import styles from './CompareGrid.module.css';
import { NOT_SET_LABEL } from '../../utils/labels';
import { cx } from '../../utils/classNames';
import { isActivateKey } from '../../utils/keys';
import {
  COMPARE_KEY_COLUMN_WIDTH,
  COMPARE_MIN_ENV_COLUMN_WIDTH
} from '../../utils/layout';
import SecureLockIcon from '../common/SecureLockIcon';
import EnvironmentLabel from '../common/EnvironmentLabel';
import SkeletonBar, { PLACEHOLDER_WIDTHS } from '../common/SkeletonBar';
import CenteredState from '../common/CenteredState';

interface ValueCellProps {
  env: string;
  parameter: ParameterEntry;
  unreadable: boolean;
  selected: boolean;
  revealed: boolean;
}

const SYNC_LABEL = 'Synchronize environments';

// Opens Synchronize environments for a key that differs or is missing
// somewhere, from the first environment whose value can be copied.
const SyncAction = ({
  row,
  environments
}: {
  row: CompareKey;
  environments: StructureEnvironment[];
}) => {
  const source = copySourceOf(row, environments);
  const blocked = copyBlockReason(source);
  return (
    <Tooltip title={blocked ?? SYNC_LABEL}>
      <Button
        type="text"
        size="small"
        icon={<RetweetOutlined />}
        aria-label={SYNC_LABEL}
        disabled={!!blocked}
        onClick={() =>
          source && uiActions.openCopyDialog(source.Name, { pickSource: true })
        }
      />
    </Tooltip>
  );
};

// The key's value in one environment. Clicking it opens the parameter;
// revealing a SecureString or copying the value doesn't.
const ValueCell = ({
  env,
  parameter,
  unreadable,
  selected,
  revealed
}: ValueCellProps) => {
  const { Name, Value } = parameter;
  const secure = isSecure(parameter);
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
      tabIndex={0}
      onClick={() => uiActions.selectParameter(Name)}
      onKeyDown={event => {
        // Not from the buttons inside.
        if (event.target !== event.currentTarget) return;
        if (!isActivateKey(event)) return;
        event.preventDefault();
        uiActions.selectParameter(Name);
      }}
    >
      {value}
      <span className={styles.actions}>
        {secure && <SecureLockIcon />}
        {secure && Value !== undefined && (
          <RevealButton
            revealed={revealed}
            onToggle={() => uiActions.toggleReveal(Name)}
          />
        )}
        {!unreadable && <CopyButton text={Value} />}
      </span>
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
              <Tooltip title={`${NOT_SET_LABEL} in ${missing.join(', ')}`}>
                <Tag color="red" className={styles.tag}>
                  Missing
                </Tag>
              </Tooltip>
            )}
            {(differs || missing.length > 0) && (
              <SyncAction row={row} environments={environments} />
            )}
          </span>
        </div>
        {environments.map(env => {
          const { segment } = env;
          const parameter = cells.get(segment);
          if (!parameter) {
            return (
              <NotSetCell
                key={segment}
                env={env}
                row={row}
                environments={environments}
              />
            );
          }
          return (
            <ValueCell
              key={segment}
              env={segment}
              parameter={parameter}
              unreadable={unreadable.includes(segment)}
              selected={parameter.Name === selectedName}
              revealed={revealed.has(parameter.Name)}
            />
          );
        })}
      </div>
    );
  }
);
KeyRow.displayName = 'KeyRow';

const EmptyState = ({ icon, text }: { icon: ReactNode; text: string }) => (
  <CenteredState vertical gap="small">
    <span className={styles.emptyIcon}>{icon}</span>
    <Typography.Text type="secondary">{text}</Typography.Text>
  </CenteredState>
);

const EMPTY_ICONS: Record<EmptyReason, ReactNode> = {
  noKeys: <FolderOpenOutlined />,
  noMatches: <SearchOutlined />,
  allSet: <CheckCircleOutlined />,
  uncompared: <WarningOutlined />,
  allSame: <CheckCircleOutlined />
};

// Why the filter lists nothing.
const emptyStateOf = (comparison: Comparison, filter: CompareFilter) => {
  const { reason, text } = emptyReasonOf(comparison, filter);
  return <EmptyState icon={EMPTY_ICONS[reason]} text={text} />;
};

// The rows' places during the first load.
const PlaceholderRows = ({ columns }: { columns: number }) =>
  PLACEHOLDER_WIDTHS.map(([key, value], index) => (
    <div key={index} role="row" className={styles.row}>
      <div className={styles.keyCell}>
        <SkeletonBar width={key} />
      </div>
      {Array.from({ length: columns }, (_, column) => (
        <div key={column} className={styles.cell}>
          <SkeletonBar width={((value + column * 15) % 60) + 25} />
        </div>
      ))}
    </div>
  ));

// In place of the rows when the first load stopped partway: the names it
// listed aren't all of them, so nothing is compared. It doesn't read the
// parameters itself: a failed query reloads when a new reader mounts, so
// showing this would retry on its own, again after every failure.
const LoadFailed = () => {
  const client = useQueryClient();
  return (
    <div className={styles.progress}>
      <Alert
        type="error"
        showIcon
        title="Couldn't load every parameter"
        description="Environments can't be compared until they have all loaded."
        action={
          <Button size="small" onClick={() => void refreshParameters(client)}>
            Retry
          </Button>
        }
      />
    </div>
  );
};

interface CompareGridProps {
  comparison: Comparison;
  // The keys the filter lists.
  keys: CompareKey[];
  // False until a load has listed every name: the frame shows with
  // placeholder rows, or with no rows and a retry when the first load
  // `failed`.
  ready: boolean;
  failed: boolean;
}

// The service's keys under the folder, one column per environment. The
// header row and the key column stay put while the values scroll; the
// columns never get narrower than COMPARE_MIN_ENV_COLUMN_WIDTH, so many environments scroll
// sideways. The environments are known from the settings, so the header
// shows from the start and only the rows wait for the first load.
const CompareGrid = ({ comparison, keys, ready, failed }: CompareGridProps) => {
  const selectedName = useUiStore(state => state.selectedName);
  const revealed = useUiStore(state => state.revealed);
  const filter = useUiStore(state => state.compareFilter);
  const delimiter = usePathDelimiter();
  const { loading } = useParameters();
  const rows = useMemo(() => compareRows(keys), [keys]);
  const { environments } = comparison;

  // Like the filter's counts: the keys matching the search, before the
  // filter.
  const counts = useMemo(() => countsByEnvironment(comparison), [comparison]);

  if (ready && !keys.length) return emptyStateOf(comparison, filter);

  const style = {
    '--compare-columns': `${COMPARE_KEY_COLUMN_WIDTH}px repeat(${environments.length}, minmax(${COMPARE_MIN_ENV_COLUMN_WIDTH}px, 1fr))`,
    minWidth:
      COMPARE_KEY_COLUMN_WIDTH +
      COMPARE_MIN_ENV_COLUMN_WIDTH * environments.length
  } as CSSProperties;

  return (
    <div className={styles.frame}>
      <div className={styles.scroll}>
        <div
          role="table"
          aria-label="Compare environments"
          aria-busy={loading || !ready}
          className={styles.grid}
          style={style}
        >
          <div role="row" className={cx(styles.row, styles.headerRow)}>
            <div role="columnheader" className={styles.keyCell}>
              Key
            </div>
            {environments.map(({ segment, color }, index) => (
              <div key={segment} role="columnheader" className={styles.cell}>
                <EnvironmentLabel
                  color={color}
                  name={segment}
                  count={counts[index]}
                  loaded={ready}
                  ellipsis
                />
              </div>
            ))}
          </div>
          {!ready && !failed && (
            <PlaceholderRows columns={environments.length} />
          )}
          {ready &&
            rows.map(row => {
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
              return (
                <KeyRow
                  key={row.key}
                  row={row}
                  environments={environments}
                  selectedName={rowHas(row, selectedName) ? selectedName : null}
                  revealed={revealed}
                />
              );
            })}
        </div>
      </div>
      {!ready && !failed && <CompareProgress />}
      {failed && <LoadFailed />}
    </div>
  );
};

export default CompareGrid;
