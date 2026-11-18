import { forwardRef } from 'react';
import type { ComponentProps } from 'react';
import { theme, Typography } from 'antd';

type HintTextProps = ComponentProps<typeof Typography.Text>;

// Help that explains a field, a section or an empty state: small secondary
// text. Another `type`, such as "danger", replaces the secondary colour.
const HintText = forwardRef<HTMLSpanElement, HintTextProps>(
  ({ style, ...rest }, ref) => {
    const { token } = theme.useToken();
    return (
      <Typography.Text
        ref={ref}
        type="secondary"
        style={{ fontSize: token.fontSizeSM, ...style }}
        {...rest}
      />
    );
  }
);
HintText.displayName = 'HintText';

export default HintText;
