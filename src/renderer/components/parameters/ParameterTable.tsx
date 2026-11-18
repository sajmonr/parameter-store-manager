import { useEffect, useMemo, useRef } from 'react';
import type { ReactNode } from 'react';
import { Table, Tooltip } from 'antd';
import type { GetRef } from 'antd';
import type { ParameterEntry } from '../../state/parameters';
import { useLocationContext } from '../../state/settings';
import { uiActions, useUiStore } from '../../state/ui';
import { useCheckContext, useLocation } from '../../state/views';
import { isEnvironmentLocation, isServiceLocation } from '../../utils/location';
import { isGroupRow, tableRowsOf } from '../../utils/tableRows';
import useElementSize from '../../hooks/useElementSize';
import styles from './ParameterTable.module.css';
import {
  TABLE_CHECKBOX_COLUMN_WIDTH,
  TABLE_HEADER_HEIGHT
} from '../../utils/layout';
import { cx } from '../../utils/classNames';
import useArrowNavigation from './useArrowNavigation';
import useTableColumns from './useTableColumns';

interface ParameterTableProps {
  parameters: ParameterEntry[];
  // The checked rows' names (see views.useCheckedNames).
  checked: string[];
  // Shown in place of the rows while there are none, such as placeholder
  // rows during the first load.
  placeholder?: ReactNode;
}

// A row's checkbox checks it for bulk actions; clicking anywhere else on the
// row opens it in the detail pane. Group rows have no checkbox.
const ParameterTable = ({
  parameters,
  checked,
  placeholder
}: ParameterTableProps) => {
  const checkContext = useCheckContext();
  const selectedName = useUiStore(state => state.selectedName);
  const location = useLocation();
  const context = useLocationContext();
  // A service's rows are its keys.
  const nameTitle =
    isServiceLocation(location) || isEnvironmentLocation(location)
      ? 'Key'
      : 'Name';
  const rows = useMemo(
    () => tableRowsOf(parameters, location, context),
    [parameters, location, context]
  );
  const revealed = useUiStore(state => state.revealed);
  const [ref, { width, height }] = useElementSize();
  const tableRef = useRef<GetRef<typeof Table>>(null);

  // Also when the location changes, such as on a view switch: the selection
  // is kept but sits elsewhere in the new rows. Not on every row change, so
  // a refresh doesn't pull the table back to it.
  useEffect(() => {
    if (selectedName && tableRef.current) {
      tableRef.current.scrollTo({ key: selectedName });
    }
  }, [selectedName, location]);

  useArrowNavigation(parameters, selectedName);
  const columns = useTableColumns({ width, nameTitle, selectedName, revealed });

  return (
    <div ref={ref} className={styles.container}>
      {width > 0 && height > 0 && (
        <Table
          ref={tableRef}
          className={cx(styles.table, !!placeholder && styles.placeholder)}
          size="small"
          virtual
          pagination={false}
          rowKey="Name"
          rowSelection={{
            columnWidth: TABLE_CHECKBOX_COLUMN_WIDTH,
            selectedRowKeys: checked,
            onChange: keys =>
              uiActions.setChecked(checkContext, keys.map(String)),
            // Disabled also leaves group rows out of Select all.
            getCheckboxProps: row =>
              isGroupRow(row)
                ? { disabled: true }
                : { 'aria-label': `Select ${row.Name}` },
            renderCell: (_checked, row, _index, checkbox) =>
              !isGroupRow(row) && checkbox,
            // The header checks every row shown, or clears them all.
            columnTitle: checkbox => (
              <Tooltip
                title={
                  checked.length === parameters.length
                    ? 'Clear selection'
                    : 'Select all'
                }
              >
                <span>{checkbox}</span>
              </Tooltip>
            )
          }}
          columns={columns}
          dataSource={rows}
          locale={placeholder ? { emptyText: placeholder } : undefined}
          scroll={{ x: width, y: height - TABLE_HEADER_HEIGHT }}
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
