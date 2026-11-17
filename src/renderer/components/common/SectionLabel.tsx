import type { ReactNode } from 'react';
import { theme, Typography } from 'antd';

// A small uppercase heading over a group of items, such as a sidebar group.
// Letter spacing and case have no antd token.
const SectionLabel = ({
  children,
  className
}: {
  children: ReactNode;
  className?: string;
}) => {
  const { token } = theme.useToken();
  return (
    <Typography.Text
      strong
      className={className}
      style={{
        fontSize: token.fontSizeSM,
        color: token.colorTextTertiary,
        letterSpacing: '0.04em',
        textTransform: 'uppercase'
      }}
    >
      {children}
    </Typography.Text>
  );
};

export default SectionLabel;
