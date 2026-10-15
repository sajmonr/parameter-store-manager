import type { MouseEvent, ReactNode } from 'react';
import { Button, Tooltip } from 'antd';
import { CopyOutlined } from '@ant-design/icons';
import useCopy from '../../hooks/useCopy';

interface CopyButtonProps {
  // Undefined while the value is loading; the button is disabled until then.
  text: string | undefined;
  label?: ReactNode;
  disabled?: boolean;
}

// Copies `text`. Without a label it is an icon button with a tooltip. Clicks
// don't reach the parent, so copying in a table row doesn't select the row.
const CopyButton = ({ text, label, disabled }: CopyButtonProps) => {
  const copy = useCopy();
  const onClick = (event: MouseEvent) => {
    event.stopPropagation();
    if (text !== undefined) copy(text);
  };
  const button = (
    <Button
      type="text"
      size="small"
      icon={<CopyOutlined />}
      onClick={onClick}
      disabled={disabled || text === undefined}
      aria-label={label ? undefined : 'Copy'}
    >
      {label}
    </Button>
  );
  return label ? button : <Tooltip title="Copy">{button}</Tooltip>;
};

export default CopyButton;
