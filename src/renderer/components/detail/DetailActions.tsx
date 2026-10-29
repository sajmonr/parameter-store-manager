import { useState } from 'react';
import { Button, Dropdown, Flex, Space, Tooltip } from 'antd';
import type { MenuProps } from 'antd';
import {
  BlockOutlined,
  DeleteOutlined,
  EditOutlined,
  EllipsisOutlined,
  RetweetOutlined
} from '@ant-design/icons';
import { isEditableType } from '../../../main/endpoints/parameters/putParameter/putParameter.contract';
import type { ParameterEntry } from '../../state/parameters';
import { uiActions } from '../../state/ui';
import { useCopyTargets } from '../../state/views';
import useEscape from '../../hooks/useEscape';
import styles from './DetailActions.module.css';

interface DetailActionsProps {
  parameter: ParameterEntry;
  onEdit: () => void;
}

// Edit, with Duplicate and Synchronize environments in its menu, and Delete.
const DetailActions = ({ parameter, onEdit }: DetailActionsProps) => {
  const { Type: type } = parameter;
  const [menuOpen, setMenuOpen] = useState(false);
  // Esc closes the menu, not the pane.
  useEscape(() => setMenuOpen(false), menuOpen);
  // Hidden under Other paths and for a service with one environment.
  const copyable = !!useCopyTargets(parameter.Name);
  // StringList parameters can't be saved yet.
  const editable = isEditableType(type);
  const unreadable = parameter.Value === undefined;
  const disabled = !editable || unreadable;
  const unsupported = `${type} is not supported yet`;

  const duplicate = () => {
    if (!editable) return;
    uiActions.openNewParameter({
      source: parameter.Name,
      description: parameter.Description || '',
      type,
      kmsKey: parameter.KeyId,
      value: parameter.Value || ''
    });
  };

  let copyReason: string | undefined;
  if (!editable) copyReason = unsupported;
  else if (unreadable) copyReason = "Can't read the value";

  const items: MenuProps['items'] = [
    {
      key: 'duplicate',
      icon: <BlockOutlined />,
      label: 'Duplicate',
      disabled
    },
    ...(copyable
      ? [
          {
            key: 'copy',
            icon: <RetweetOutlined />,
            label: (
              <Tooltip title={copyReason} placement="right">
                <span>Synchronize environments</span>
              </Tooltip>
            ),
            disabled: !!copyReason
          }
        ]
      : [])
  ];

  const onMenuClick: MenuProps['onClick'] = ({ key }) => {
    setMenuOpen(false);
    if (key === 'duplicate') duplicate();
    if (key === 'copy') uiActions.openCopyDialog(parameter.Name);
  };

  return (
    <Flex gap={8}>
      <Space.Compact>
        <Tooltip title={editable ? undefined : unsupported}>
          <Button icon={<EditOutlined />} onClick={onEdit} disabled={disabled}>
            Edit
          </Button>
        </Tooltip>
        <Dropdown
          trigger={['click']}
          placement="bottomLeft"
          open={menuOpen}
          onOpenChange={setMenuOpen}
          menu={{ items, onClick: onMenuClick }}
          styles={{ root: { minWidth: 230 } }}
        >
          <Tooltip title={menuOpen ? undefined : 'More actions'}>
            <Button
              icon={<EllipsisOutlined />}
              aria-label="More actions"
              className={menuOpen ? styles.open : undefined}
            />
          </Tooltip>
        </Dropdown>
      </Space.Compact>
      <div style={{ marginLeft: 'auto' }}>
        <Button
          danger
          icon={<DeleteOutlined />}
          onClick={() =>
            uiActions.requestDelete({
              kind: 'parameter',
              label: parameter.Name,
              names: [parameter.Name]
            })
          }
        >
          Delete
        </Button>
      </div>
    </Flex>
  );
};

export default DetailActions;
