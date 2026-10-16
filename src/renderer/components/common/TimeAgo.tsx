import ReactTimeAgo from 'react-time-ago';

// Relative time such as "3 days ago"; renders nothing without a date.
const TimeAgo = ({ date }: { date: Date | undefined | null }) =>
  date ? <ReactTimeAgo date={date} /> : null;

export default TimeAgo;
