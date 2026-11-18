import { Typography } from 'antd';

interface HighlightTextProps {
  text: string;
  highlight?: string;
}

// `text` with the first case-insensitive occurrence of `highlight` marked.
const HighlightText = ({ text, highlight = '' }: HighlightTextProps) => {
  const index = highlight
    ? text.toLowerCase().indexOf(highlight.toLowerCase())
    : -1;
  if (index < 0) return text;
  const end = index + highlight.length;
  return (
    <>
      {text.slice(0, index)}
      <Typography.Text mark>{text.slice(index, end)}</Typography.Text>
      {text.slice(end)}
    </>
  );
};

export default HighlightText;
