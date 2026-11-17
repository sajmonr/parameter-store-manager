import { forwardRef } from 'react';
import type { ComponentProps } from 'react';
import { theme, Typography } from 'antd';

export type MonoProps = ComponentProps<typeof Typography.Text> & {
  // The small font size; `size` overrides it.
  small?: boolean;
  size?: number;
  weight?: number;
};

// Text in the code font, for parameter names, paths and values. It takes a
// ref so a Tooltip around it can find where to show.
const Mono = forwardRef<HTMLSpanElement, MonoProps>(
  ({ small, size, weight, style, ...rest }, ref) => {
    const { token } = theme.useToken();
    return (
      <Typography.Text
        ref={ref}
        style={{
          fontFamily: token.fontFamilyCode,
          fontSize: size ?? (small ? token.fontSizeSM : undefined),
          fontWeight: weight,
          ...style
        }}
        {...rest}
      />
    );
  }
);
Mono.displayName = 'Mono';

export default Mono;
