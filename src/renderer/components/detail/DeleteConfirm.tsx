import { useState } from 'react';
import { App, Button, Popconfirm } from 'antd';
import { DeleteOutlined } from '@ant-design/icons';
import { useDeleteParameter } from '../../state/parameters';
import { usePathDelimiter } from '../../state/settings';
import { uiActions } from '../../state/ui';
import { leafOf } from '../../utils/paths';
import useEscape from '../../hooks/useEscape';
import Mono from '../common/Mono';

// The Delete button and its confirmation. Deleting closes the pane.
const DeleteConfirm = ({ name }: { name: string }) => {
  const { notification } = App.useApp();
  const delimiter = usePathDelimiter();
  const deleteParameter = useDeleteParameter();
  const [open, setOpen] = useState(false);

  useEscape(() => setOpen(false), open);

  const handleDelete = () =>
    deleteParameter
      .mutateAsync(name)
      .then(() => {
        setOpen(false);
        uiActions.closePane();
        notification.success({
          title: 'Parameter deleted',
          description: name
        });
      })
      .catch(err => {
        notification.error({
          title: 'Something went wrong while deleting the parameter.',
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

export default DeleteConfirm;
