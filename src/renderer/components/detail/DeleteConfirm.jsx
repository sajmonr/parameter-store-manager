import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { App, Button, Popconfirm } from 'antd';
import { DeleteOutlined } from '@ant-design/icons';
import { useDispatch, useSelector } from 'react-redux';
import { actions as parameterActions } from '../../ducks/parameters';
import { selectors as settingsSelectors } from '../../ducks/settings';
import { actions as uiActions } from '../../ducks/ui';
import { leafOf } from '../../utils/paths';
import useEscape from '../../hooks/useEscape';
import Mono from '../common/Mono';

// The Delete button and its confirmation. Deleting closes the pane.
const DeleteConfirm = ({ name }) => {
  const dispatch = useDispatch();
  const { notification } = App.useApp();
  const delimiter = useSelector(settingsSelectors.getPathDelimiter);
  const [open, setOpen] = useState(false);

  useEscape(() => setOpen(false), open);

  const handleDelete = () =>
    dispatch(parameterActions.deleteParameter(name))
      .then(() => {
        setOpen(false);
        dispatch(uiActions.closePane());
        notification.success({
          message: 'Parameter deleted',
          description: name
        });
      })
      .catch(err => {
        notification.error({
          message: 'Something went wrong while deleting the parameter.',
          description: err.code || err.message || ''
        });
      });

  return (
    <Popconfirm
      open={open}
      onOpenChange={setOpen}
      placement="bottomRight"
      title="Delete this parameter?"
      description={
        <span style={{ display: 'block', maxWidth: 280 }}>
          <Mono>{leafOf(name, delimiter)}</Mono> will be permanently removed.
          This can&apos;t be undone.
        </span>
      }
      okText="Delete"
      okButtonProps={{ danger: true }}
      cancelText="Cancel"
      onConfirm={handleDelete}
    >
      <Button danger icon={<DeleteOutlined />}>
        Delete
      </Button>
    </Popconfirm>
  );
};

DeleteConfirm.propTypes = {
  name: PropTypes.string.isRequired
};

export default DeleteConfirm;
