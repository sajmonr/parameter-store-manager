import React from 'react';
import PropTypes from 'prop-types';
import { Typography } from 'antd';

// Text in the code font, for parameter names, paths and values.
const Mono = ({ size, weight, style, ...rest }) => (
  <Typography.Text
    style={{
      fontFamily: 'var(--ant-font-family-code)',
      fontSize: size,
      fontWeight: weight,
      ...style
    }}
    {...rest}
  />
);

Mono.propTypes = {
  size: PropTypes.number,
  style: PropTypes.object,
  weight: PropTypes.number
};

export default Mono;
