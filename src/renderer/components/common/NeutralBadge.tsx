import type { ComponentProps } from 'react';
import { Badge, theme } from 'antd';

// A count badge in neutral colours, not red: the count isn't something to
// act on. `solid` uses an opaque fill, so a border behind it doesn't show
// through.
const NeutralBadge = ({
  solid = false,
  ...rest
}: ComponentProps<typeof Badge> & { solid?: boolean }) => {
  const { token } = theme.useToken();
  return (
    <Badge
      styles={{
        indicator: {
          background: solid ? token.colorBorder : token.colorFillSecondary,
          color: token.colorText,
          boxShadow: 'none'
        }
      }}
      {...rest}
    />
  );
};

export default NeutralBadge;
