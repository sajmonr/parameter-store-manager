import { Button, Flex, Tooltip } from 'antd';
import { CopyOutlined, DeleteOutlined, EditOutlined } from '@ant-design/icons';
import { isEditableType } from '../../../main/endpoints/parameters/putParameter/putParameter.contract';
import type { ParameterEntry } from '../../state/parameters';
import { uiActions } from '../../state/ui';

interface DetailActionsProps {
  parameter: ParameterEntry;
  onEdit: () => void;
}

const DetailActions = ({ parameter, onEdit }: DetailActionsProps) => {
  const { Type: type } = parameter;
  // StringList parameters can't be saved yet.
  const editable = isEditableType(type);
  const disabled = !editable || parameter.Value === undefined;

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

  return (
    <Flex gap={8}>
      <Tooltip title={editable ? undefined : `${type} is not supported yet`}>
        <Flex gap={8}>
          <Button icon={<EditOutlined />} onClick={onEdit} disabled={disabled}>
            Edit
          </Button>
          <Button
            icon={<CopyOutlined />}
            onClick={duplicate}
            disabled={disabled}
          >
            Duplicate
          </Button>
        </Flex>
      </Tooltip>
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
