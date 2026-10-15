import React from 'react';
import PropTypes from 'prop-types';
import { Tag } from 'antd';
import { LockOutlined } from '@ant-design/icons';

const ParameterTypeTag = ({ type }) =>
  type === 'SecureString' ? (
    <Tag color="gold" icon={<LockOutlined />}>
      SecureString
    </Tag>
  ) : (
    <Tag color="blue">{type}</Tag>
  );

ParameterTypeTag.propTypes = {
  type: PropTypes.string.isRequired
};

export default ParameterTypeTag;
