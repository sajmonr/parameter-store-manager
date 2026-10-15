import type { ComponentProps } from 'react';
import { Typography } from 'antd';

export type MonoProps = ComponentProps<typeof Typography.Text> & {
  size?: number;
  weight?: number;
};

// Text in the code font, for parameter names, paths and values.
const Mono = ({ size, weight, style, ...rest }: MonoProps) => (
  <Typography.Text
    style={{
      fontFamily: 'var(--ant-font-family-code)',
      fontSize: size,
      fontWeight: weight,
      ...style
    }}
    {...rest}
  />
);

export default Mono;
