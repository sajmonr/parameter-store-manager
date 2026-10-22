import type { ReactNode } from 'react';
import { Descriptions, Typography } from 'antd';
import type { ParameterEntry } from '../../state/parameters';
import Mono from '../common/Mono';
import TimeAgo from '../common/TimeAgo';

const dateFormat: Intl.DateTimeFormatOptions = {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
  hour: 'numeric',
  minute: '2-digit'
};

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
      label: 'KMS key',
      children: Type === 'SecureString' ? <Mono>{KeyId}</Mono> : '—'
    },
    { key: 'version', label: 'Version', children: Version },
    {
      key: 'modified',
      label: 'Last modified',
      children: LastModifiedDate && (
        <>
          {LastModifiedDate.toLocaleString(undefined, dateFormat)} ·{' '}
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
