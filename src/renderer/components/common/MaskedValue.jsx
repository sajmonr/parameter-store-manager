import React from 'react';
import PropTypes from 'prop-types';
import Mono from './Mono';

export const MASK = '••••••••';

// A parameter value; SecureString values stay masked until revealed.
const MaskedValue = ({ value, secure, revealed, ...rest }) => {
  if (value === undefined) {
    return (
      <Mono type="secondary" {...rest}>
        …
      </Mono>
    );
  }
  return <Mono {...rest}>{secure && !revealed ? MASK : value}</Mono>;
};

MaskedValue.propTypes = {
  revealed: PropTypes.bool,
  secure: PropTypes.bool,
  value: PropTypes.string
};

export default MaskedValue;
