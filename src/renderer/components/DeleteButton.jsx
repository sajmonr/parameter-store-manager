import React from 'react';
import PropTypes from 'prop-types';
import { Button, Popconfirm } from 'antd';
import { feedback } from '../feedback';

const DeleteButton = ({ name, onDelete }) => {
  const handleDelete = () =>
    onDelete(name)
      .then(() => {
        feedback.notification.success({
          message: 'Parameter was deleted.'
        });
      })
      .catch(err => {
        feedback.notification.error({
          message: 'Something went wrong while deleting the parameter.',
          description: err.code || ''
        });
      });

  return (
    <Popconfirm
      placement="left"
      title={
        <div>
          <div>Are you sure you want to delete parameter</div>
          <code>{name}</code>
        </div>
      }
      onConfirm={handleDelete}
      okText="Yes"
      cancelText="No"
    >
      <Button danger>Delete</Button>
    </Popconfirm>
  );
};

DeleteButton.propTypes = {
  name: PropTypes.string.isRequired,
  onDelete: PropTypes.func.isRequired
};

export default DeleteButton;
