import { Tag } from 'antd';
import { LockOutlined } from '@ant-design/icons';

interface ParameterTypeTagProps {
  type: string | undefined;
}

const ParameterTypeTag = ({ type }: ParameterTypeTagProps) =>
  type === 'SecureString' ? (
    <Tag color="gold" icon={<LockOutlined />}>
      SecureString
    </Tag>
  ) : (
    <Tag color="blue">{type}</Tag>
  );

export default ParameterTypeTag;
