import { Tag } from 'antd';
import { LockOutlined } from '@ant-design/icons';
import { PARAMETER_TYPE, isSecureType } from '../../../shared/parameterTypes';

interface ParameterTypeTagProps {
  type: string | undefined;
}

const ParameterTypeTag = ({ type }: ParameterTypeTagProps) =>
  isSecureType(type) ? (
    <Tag color="gold" icon={<LockOutlined />}>
      {PARAMETER_TYPE.SecureString}
    </Tag>
  ) : (
    <Tag color="blue">{type}</Tag>
  );

export default ParameterTypeTag;
