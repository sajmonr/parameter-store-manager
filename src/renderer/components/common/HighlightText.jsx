import React from 'react';
import PropTypes from 'prop-types';

const HIGHLIGHT_COLOR = '#f50';

// `text` with the first case-insensitive occurrence of `highlight` in orange.
const HighlightText = ({ text, highlight }) => {
  const index = highlight
    ? text.toLowerCase().indexOf(highlight.toLowerCase())
    : -1;
  if (index < 0) return text;
  const end = index + highlight.length;
  return (
    <>
      {text.slice(0, index)}
      <span style={{ color: HIGHLIGHT_COLOR }}>{text.slice(index, end)}</span>
      {text.slice(end)}
    </>
  );
};

HighlightText.propTypes = {
  highlight: PropTypes.string,
  text: PropTypes.string.isRequired
};

export default HighlightText;
