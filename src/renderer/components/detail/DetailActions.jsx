import React from 'react';
import PropTypes from 'prop-types';
import { Button, Flex } from 'antd';
import { CopyOutlined, EditOutlined } from '@ant-design/icons';
import { usePathDelimiter } from '../../state/settings';
import { uiActions } from '../../state/ui';
import { folderOf, leafOf } from '../../utils/paths';
import DeleteConfirm from './DeleteConfirm';

const DetailActions = ({ parameter, onEdit }) => {
  const delimiter = usePathDelimiter();

  const duplicate = () =>
    uiActions.openNewParameter({
      folder: folderOf(parameter.Name, delimiter),
      name: `${leafOf(parameter.Name, delimiter)}Copy`,
      description: parameter.Description || '',
      type: parameter.Type,
      kmsKey: parameter.KeyId,
      value: parameter.Value || ''
    });

  return (
    <Flex gap={8}>
      <Button
        icon={<EditOutlined />}
        onClick={onEdit}
        disabled={parameter.Value === undefined}
      >
        Edit
      </Button>
      <Button
        icon={<CopyOutlined />}
        onClick={duplicate}
        disabled={parameter.Value === undefined}
      >
        Duplicate
      </Button>
      <div style={{ marginLeft: 'auto' }}>
        <DeleteConfirm name={parameter.Name} />
      </div>
    </Flex>
  );
};

DetailActions.propTypes = {
  onEdit: PropTypes.func.isRequired,
  parameter: PropTypes.shape({
    Description: PropTypes.string,
    KeyId: PropTypes.string,
    Name: PropTypes.string.isRequired,
    Type: PropTypes.string.isRequired,
    Value: PropTypes.string
  }).isRequired
};

export default DetailActions;
