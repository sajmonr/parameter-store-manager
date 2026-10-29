import { forwardRef } from 'react';
import type { ComponentProps } from 'react';
import { Typography } from 'antd';

export type MonoProps = ComponentProps<typeof Typography.Text> & {
  size?: number;
  weight?: number;
};

// Text in the code font, for parameter names, paths and values. It takes a
// ref so a Tooltip around it can find where to show.
const Mono = forwardRef<HTMLSpanElement, MonoProps>(
  ({ size, weight, style, ...rest }, ref) => (
    <Typography.Text
      ref={ref}
      style={{
        fontFamily: 'var(--ant-font-family-code)',
        fontSize: size,
        fontWeight: weight,
        ...style
      }}
      {...rest}
    />
  )
);
Mono.displayName = 'Mono';

export default Mono;
