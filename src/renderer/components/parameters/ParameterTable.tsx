import { useEffect, useMemo, useRef, useState } from 'react';
import { Table, Tooltip } from 'antd';
import type { GetRef, TableColumnsType } from 'antd';
import { LockOutlined } from '@ant-design/icons';
import type { ParameterEntry } from '../../state/parameters';
import { uiActions, useUiStore } from '../../state/ui';
import useElementSize from '../../hooks/useElementSize';
import NameCell from './NameCell';
import ValueCell from './ValueCell';
import styles from './ParameterTable.module.css';

// Height of the small table's header row; the rest of the space scrolls.
const HEADER_HEIGHT = 39;
const LOCK_COLUMN_WIDTH = 40;

const isSecure = (parameter: ParameterEntry) =>
  parameter.Type === 'SecureString';

// ↑/↓ move the selection unless the user is typing or using another widget.
const isArrowNavigationTarget = (target: EventTarget | null) =>
  !(target instanceof Element) ||
  !target.closest(
    'input, textarea, select, [contenteditable], [role="tree"], .ant-modal, .ant-popover, .ant-drawer'
  );

const ParameterTable = ({ parameters }: { parameters: ParameterEntry[] }) => {
  const selectedName = useUiStore(state => state.selectedName);
  const settingsOpen = useUiStore(state => state.settingsOpen);
  const [revealed, setRevealed] = useState<Record<string, boolean>>({});
  const [ref, { width, height }] = useElementSize();
  const tableRef = useRef<GetRef<typeof Table>>(null);

  const toggleReveal = (name: string) =>
    setRevealed(prev => ({ ...prev, [name]: !prev[name] }));

  useEffect(() => {
    if (selectedName && tableRef.current) {
      tableRef.current.scrollTo({ key: selectedName });
    }
  }, [selectedName]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return;
      if (settingsOpen || !parameters.length) return;
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
  }, [parameters, selectedName, settingsOpen]);

  const columns = useMemo<TableColumnsType<ParameterEntry>>(
    () => [
      {
        title: 'Name',
        key: 'name',
        width: Math.round((width - LOCK_COLUMN_WIDTH) * 0.45),
        render: (_, parameter) => (
          <NameCell
            parameter={parameter}
            selected={parameter.Name === selectedName}
          />
        )
      },
      {
        title: 'Value',
        key: 'value',
        render: (_, parameter) => (
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
        render: (_, parameter) =>
          isSecure(parameter) && (
            <Tooltip title="SecureString">
              <LockOutlined className={styles.lock} aria-label="SecureString" />
            </Tooltip>
          )
      }
    ],
    [width, selectedName, revealed]
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
          dataSource={parameters}
          scroll={{ x: width, y: height - HEADER_HEIGHT }}
          rowClassName={parameter =>
            (parameter.Name === selectedName && styles.selected) || ''
          }
          onRow={parameter => ({
            onClick: () => uiActions.selectParameter(parameter.Name)
          })}
        />
      )}
    </div>
  );
};

export default ParameterTable;
