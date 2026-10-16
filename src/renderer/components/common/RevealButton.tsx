import type { MouseEvent } from 'react';
import { Button, Tooltip } from 'antd';
import { EyeInvisibleOutlined, EyeOutlined } from '@ant-design/icons';

// Shows or hides a SecureString value. With `withLabel` the button says
// Reveal/Hide, otherwise it is an icon button with a tooltip.
interface RevealButtonProps {
  revealed: boolean;
  onToggle: () => void;
  withLabel?: boolean;
}

const RevealButton = ({ revealed, onToggle, withLabel }: RevealButtonProps) => {
  const text = revealed ? 'Hide' : 'Reveal';
  const onClick = (event: MouseEvent) => {
    event.stopPropagation();
    onToggle();
  };
  const button = (
    <Button
      type="text"
      size="small"
      icon={revealed ? <EyeInvisibleOutlined /> : <EyeOutlined />}
      onClick={onClick}
      aria-label={withLabel ? undefined : text}
    >
      {withLabel && text}
    </Button>
  );
  return withLabel ? button : <Tooltip title={text}>{button}</Tooltip>;
};

export default RevealButton;
