import { forwardRef } from 'react';
import type { ComponentProps } from 'react';
import { theme, Typography } from 'antd';

export type MonoProps = ComponentProps<typeof Typography.Text> & {
  // The small or large font size token; the base size without.
  size?: 'small' | 'large';
  weight?: number;
};

// Text in the code font, for parameter names, paths and values. It takes a
// ref so a Tooltip around it can find where to show.
const Mono = forwardRef<HTMLSpanElement, MonoProps>(
  ({ size, weight, style, ...rest }, ref) => {
    const { token } = theme.useToken();
    return (
      <Typography.Text
        ref={ref}
        style={{
          fontFamily: token.fontFamilyCode,
          fontSize:
            size && (size === 'small' ? token.fontSizeSM : token.fontSizeLG),
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
