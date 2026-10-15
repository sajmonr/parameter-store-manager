import React from 'react';
import PropTypes from 'prop-types';
import { Descriptions, Typography } from 'antd';
import Mono from '../common/Mono';
import TimeAgo from '../common/TimeAgo';

const dateFormat = {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
  hour: 'numeric',
  minute: '2-digit'
};

const ParameterMeta = ({ parameter }) => {
  const { Description, Type, KeyId, Version, LastModifiedDate } = parameter;
  const items = [
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

ParameterMeta.propTypes = {
  parameter: PropTypes.shape({
    Description: PropTypes.string,
    KeyId: PropTypes.string,
    LastModifiedDate: PropTypes.instanceOf(Date),
    Type: PropTypes.string,
    Version: PropTypes.number
  }).isRequired
};

export default ParameterMeta;
