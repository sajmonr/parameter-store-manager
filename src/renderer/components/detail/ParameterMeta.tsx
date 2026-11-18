import type { ReactNode } from 'react';
import { Descriptions, Typography } from 'antd';
import type { ParameterEntry } from '../../state/parameters';
import Mono from '../common/Mono';
import TimeAgo from '../common/TimeAgo';
import { isSecureType } from '../../../shared/parameterTypes';
import { formatModified } from '../../utils/dates';
import { EMPTY_VALUE, KMS_KEY_LABEL } from '../../utils/labels';

interface ParameterMetaProps {
  parameter: ParameterEntry;
  // The first row, when the parameter is in a service.
  environments?: ReactNode;
}

const ParameterMeta = ({ parameter, environments }: ParameterMetaProps) => {
  const { Description, Type, KeyId, Version, LastModifiedDate } = parameter;
  const items = [
    ...(environments
      ? [{ key: 'environments', label: 'Environments', children: environments }]
      : []),
    {
      key: 'description',
      label: 'Description',
      children: Description || (
        <Typography.Text type="secondary">No description</Typography.Text>
      )
    },
    {
      key: 'kms',
      label: KMS_KEY_LABEL,
      children: isSecureType(Type) ? <Mono>{KeyId}</Mono> : EMPTY_VALUE
    },
    { key: 'version', label: 'Version', children: Version },
    {
      key: 'modified',
      label: 'Last modified',
      children: LastModifiedDate && (
        <>
          {formatModified(LastModifiedDate)} ·{' '}
          <TimeAgo date={LastModifiedDate} />
        </>
      )
    }
  ];

  return (
    <Descriptions
      bordered
      column={1}
      size="small"
      items={items}
      styles={{ label: { width: 116 } }}
    />
  );
};

export default ParameterMeta;
