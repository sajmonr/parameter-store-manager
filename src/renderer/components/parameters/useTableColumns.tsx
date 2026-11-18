import { useMemo } from 'react';
import type { TableColumnsType } from 'antd';
import { isSecure } from '../../../shared/parameterTypes';
import { uiActions } from '../../state/ui';
import {
  TABLE_CHECKBOX_COLUMN_WIDTH,
  TABLE_LOCK_COLUMN_WIDTH
} from '../../utils/layout';
import { isGroupRow } from '../../utils/tableRows';
import type { TableRow } from '../../utils/tableRows';
import SecureLockIcon from '../common/SecureLockIcon';
import GroupHeader from './GroupHeader';
import NameCell from './NameCell';
import ValueCell from './ValueCell';

// A group row spans every column.
const spanGroupRow = (columns: number) => (row: TableRow) => ({
  colSpan: isGroupRow(row) ? columns : 1
});
const hideInGroupRow = (row: TableRow) => ({
  colSpan: isGroupRow(row) ? 0 : 1
});

// The name, value and padlock columns. The name takes 45% of what the fixed
// columns leave of `width`.
const useTableColumns = ({
  width,
  nameTitle,
  selectedName,
  revealed
}: {
  width: number;
  nameTitle: string;
  selectedName: string | null;
  revealed: ReadonlySet<string>;
}) =>
  useMemo<TableColumnsType<TableRow>>(
    () => [
      {
        title: nameTitle,
        key: 'name',
        width: Math.round(
          (width - TABLE_CHECKBOX_COLUMN_WIDTH - TABLE_LOCK_COLUMN_WIDTH) * 0.45
        ),
        onCell: spanGroupRow(3),
        render: (_, row) =>
          isGroupRow(row) ? (
            <GroupHeader row={row} />
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
              revealed={revealed.has(parameter.Name)}
              onToggleReveal={() => uiActions.toggleReveal(parameter.Name)}
            />
          )
      },
      {
        key: 'lock',
        width: TABLE_LOCK_COLUMN_WIDTH,
        align: 'center',
        onCell: hideInGroupRow,
        render: (_, parameter) =>
          !isGroupRow(parameter) && isSecure(parameter) && <SecureLockIcon />
      }
    ],
    [width, selectedName, revealed, nameTitle]
  );

export default useTableColumns;
