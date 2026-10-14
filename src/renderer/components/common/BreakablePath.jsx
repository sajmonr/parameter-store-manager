import React from 'react';
import PropTypes from 'prop-types';

// A path that wraps after a delimiter rather than inside a segment.
const BreakablePath = ({ path, delimiter }) =>
  path.split(delimiter).map((segment, index, segments) => (
    <React.Fragment key={index}>
      {segment}
      {index < segments.length - 1 && (
        <>
          {delimiter}
          <wbr />
        </>
      )}
    </React.Fragment>
  ));

BreakablePath.propTypes = {
  delimiter: PropTypes.string.isRequired,
  path: PropTypes.string.isRequired
};

export default BreakablePath;
