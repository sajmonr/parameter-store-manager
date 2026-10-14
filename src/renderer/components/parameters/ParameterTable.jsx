import React, { useEffect, useMemo, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import { Table, Tooltip } from 'antd';
import { LockOutlined } from '@ant-design/icons';
import { useDispatch, useSelector } from 'react-redux';
import { actions as uiActions, selectors as uiSelectors } from '../../ducks/ui';
import useElementSize from '../../hooks/useElementSize';
import NameCell from './NameCell';
import ValueCell from './ValueCell';
import styles from './ParameterTable.module.css';

// Height of the small table's header row; the rest of the space scrolls.
const HEADER_HEIGHT = 39;
const LOCK_COLUMN_WIDTH = 40;

const isSecure = parameter => parameter.Type === 'SecureString';

// ↑/↓ move the selection unless the user is typing or using another widget.
const isArrowNavigationTarget = target =>
  !(target instanceof Element) ||
  !target.closest(
    'input, textarea, select, [contenteditable], [role="tree"], .ant-modal, .ant-popover, .ant-drawer'
  );

const ParameterTable = ({ parameters }) => {
  const dispatch = useDispatch();
  const selectedName = useSelector(uiSelectors.getSelectedName);
  const settingsOpen = useSelector(uiSelectors.getIsSettingsOpen);
  const [revealed, setRevealed] = useState({});
  const [ref, { width, height }] = useElementSize();
  const tableRef = useRef(null);

  const toggleReveal = name =>
    setRevealed(prev => ({ ...prev, [name]: !prev[name] }));

  useEffect(() => {
    if (selectedName && tableRef.current) {
      tableRef.current.scrollTo({ key: selectedName });
    }
  }, [selectedName]);

  useEffect(() => {
    const onKeyDown = event => {
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
      dispatch(uiActions.selectParameter(parameters[next].Name));
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [dispatch, parameters, selectedName, settingsOpen]);

  const columns = useMemo(
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
            parameter.Name === selectedName ? styles.selected : ''
          }
          onRow={parameter => ({
            onClick: () => dispatch(uiActions.selectParameter(parameter.Name))
          })}
        />
      )}
    </div>
  );
};

ParameterTable.propTypes = {
  parameters: PropTypes.arrayOf(PropTypes.object).isRequired
};

export default ParameterTable;
