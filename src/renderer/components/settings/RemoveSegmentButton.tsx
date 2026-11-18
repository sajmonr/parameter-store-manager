import { Button, Popconfirm } from 'antd';
import { DeleteOutlined } from '@ant-design/icons';
import { OTHER_PATHS_LABEL } from '../../utils/labels';

// Removes a service or environment from the structure, after a confirmation
// that says where its parameters go.
const RemoveSegmentButton = ({
  segment,
  onRemove
}: {
  segment: string;
  onRemove: () => void;
}) => (
  <Popconfirm
    title={`Remove ${segment}?`}
    description={`Its parameters will appear under ${OTHER_PATHS_LABEL}.`}
    okText="Remove"
    okButtonProps={{ danger: true }}
    onConfirm={onRemove}
  >
    <Button
      type="text"
      size="small"
      icon={<DeleteOutlined />}
      aria-label={`Remove ${segment}`}
    />
  </Popconfirm>
);

export default RemoveSegmentButton;
