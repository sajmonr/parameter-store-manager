import PropTypes from 'prop-types';

export const formDataShape = {
  name: PropTypes.string,
  description: PropTypes.string,
  type: PropTypes.oneOf(['String', 'SecureString']),
  // KMS key alias or key ID, as stored on the parameter.
  kmsKey: PropTypes.string,
  value: PropTypes.string
};
