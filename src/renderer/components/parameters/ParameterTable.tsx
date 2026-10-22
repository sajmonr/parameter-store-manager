import { useEffect, useMemo, useRef, useState } from 'react';
import { Table, Tooltip } from 'antd';
import type { GetRef, TableColumnsType } from 'antd';
import { AppstoreOutlined, LockOutlined } from '@ant-design/icons';
import type { ParameterEntry } from '../../state/parameters';
import { useLocationContext } from '../../state/settings';
import { uiActions, useUiStore } from '../../state/ui';
import { useLocation } from '../../state/views';
import {
  groupByService,
  isEnvironmentLocation,
  isServiceLocation,
  isWholeEnvironment
} from '../../utils/location';
import type { Location } from '../../utils/location';
import useElementSize from '../../hooks/useElementSize';
import usePageVisible from '../../hooks/usePageVisible';
import NameCell from './NameCell';
import ValueCell from './ValueCell';
import styles from './ParameterTable.module.css';

// Height of the small table's header row; the rest of the space scrolls.
const HEADER_HEIGHT = 39;
const LOCK_COLUMN_WIDTH = 40;

// A whole environment's rows come under a header row per service.
interface GroupRow {
  // The row key; parameter names can't contain brackets.
  Name: string;
  service: string;
  count: number;
}

type Row = ParameterEntry | GroupRow;

const isGroupRow = (row: Row): row is GroupRow => 'service' in row;

const isSecure = (parameter: ParameterEntry) =>
  parameter.Type === 'SecureString';

// A group row spans every column.
const spanGroupRow = (columns: number) => (row: Row) => ({
  colSpan: isGroupRow(row) ? columns : 1
});
const hideInGroupRow = (row: Row) => ({ colSpan: isGroupRow(row) ? 0 : 1 });

// The parameters, with a header row before each service's when `location`
// is a whole environment.
const rowsOf = (
  parameters: ParameterEntry[],
  location: Location,
  context: ReturnType<typeof useLocationContext>
): Row[] => {
  if (!isWholeEnvironment(location)) return parameters;
  return groupByService(parameters, context).flatMap(
    ({ service, parameters: rows }) => [
      {
        Name: JSON.stringify(['group', service]),
        service,
        count: rows.length
      },
      ...rows
    ]
  );
};

// ↑/↓ move the selection unless the user is typing or using another widget.
const isArrowNavigationTarget = (target: EventTarget | null) =>
  !(target instanceof Element) ||
  !target.closest(
    'input, textarea, select, [contenteditable], [role="tree"], .ant-modal, .ant-popover, .ant-drawer'
  );

const ParameterTable = ({ parameters }: { parameters: ParameterEntry[] }) => {
  const selectedName = useUiStore(state => state.selectedName);
  const location = useLocation();
  const context = useLocationContext();
  // A service's rows are its keys.
  const nameTitle =
    isServiceLocation(location) || isEnvironmentLocation(location)
      ? 'Key'
      : 'Name';
  const rows = useMemo(
    () => rowsOf(parameters, location, context),
    [parameters, location, context]
  );
  const pageVisible = usePageVisible();
  const [revealed, setRevealed] = useState<Record<string, boolean>>({});
  const [ref, { width, height }] = useElementSize();
  const tableRef = useRef<GetRef<typeof Table>>(null);

  const toggleReveal = (name: string) =>
    setRevealed(prev => ({ ...prev, [name]: !prev[name] }));

  // Also when the location changes, such as on a view switch: the selection
  // is kept but sits elsewhere in the new rows. Not on every row change, so
  // a refresh doesn't pull the table back to it.
  useEffect(() => {
    if (selectedName && tableRef.current) {
      tableRef.current.scrollTo({ key: selectedName });
    }
  }, [selectedName, location]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return;
      if (!pageVisible || !parameters.length) return;
      if (!isArrowNavigationTarget(event.target)) return;
      event.preventDefault();
      const index = parameters.findIndex(p => p.Name === selectedName);
      let next = 0;
      if (index >= 0) {
        next =
          event.key === 'ArrowDown'
            ? Math.min(parameters.length - 1, index + 1)
            : Math.max(0, index - 1);
      }
      const nextParameter = parameters[next];
      if (nextParameter) uiActions.selectParameter(nextParameter.Name);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [parameters, selectedName, pageVisible]);

  const columns = useMemo<TableColumnsType<Row>>(
    () => [
      {
        title: nameTitle,
        key: 'name',
        width: Math.round((width - LOCK_COLUMN_WIDTH) * 0.45),
        onCell: spanGroupRow(3),
        render: (_, row) =>
          isGroupRow(row) ? (
            <span className={styles.group}>
              <AppstoreOutlined />
              <span className={styles.groupName}>{row.service}</span>
              <span className={styles.groupCount}>{row.count}</span>
            </span>
          ) : (
            <NameCell parameter={row} selected={row.Name === selectedName} />
          )
      },
      {
        title: 'Value',
        key: 'value',
        onCell: hideInGroupRow,
        render: (_, parameter) =>
          !isGroupRow(parameter) && (
            <ValueCell
              parameter={parameter}
              revealed={!!revealed[parameter.Name]}
              onToggleReveal={() => toggleReveal(parameter.Name)}
            />
          )
      },
      {
        key: 'lock',
        width: LOCK_COLUMN_WIDTH,
        align: 'center',
        onCell: hideInGroupRow,
        render: (_, parameter) =>
          !isGroupRow(parameter) &&
          isSecure(parameter) && (
            <Tooltip title="SecureString">
              <LockOutlined className={styles.lock} aria-label="SecureString" />
            </Tooltip>
          )
      }
    ],
    [width, selectedName, revealed, nameTitle]
  );

  return (
    <div ref={ref} className={styles.container}>
      {width > 0 && height > 0 && (
        <Table
          ref={tableRef}
          className={styles.table}
          size="small"
          virtual
          pagination={false}
          rowKey="Name"
          columns={columns}
          dataSource={rows}
          scroll={{ x: width, y: height - HEADER_HEIGHT }}
          rowClassName={row => {
            if (isGroupRow(row)) return styles.groupRow ?? '';
            return (row.Name === selectedName && styles.selected) || '';
          }}
          onRow={row => ({
            // A group row narrows the environment to its service.
            onClick: () => {
              if (!isGroupRow(row)) uiActions.selectParameter(row.Name);
              else if (isEnvironmentLocation(location)) {
                uiActions.setLocation({ ...location, service: row.service });
              }
            }
          })}
        />
      )}
    </div>
  );
};

export default ParameterTable;
