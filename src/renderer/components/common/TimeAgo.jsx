import React from 'react';
import PropTypes from 'prop-types';
import ReactTimeAgo from 'react-time-ago';

// Relative time such as "3 days ago"; renders nothing without a date.
const TimeAgo = ({ date }) => (date ? <ReactTimeAgo date={date} /> : null);

TimeAgo.propTypes = {
  date: PropTypes.instanceOf(Date)
};

export default TimeAgo;
