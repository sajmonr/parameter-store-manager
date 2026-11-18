import type { ComponentProps } from 'react';
import { Flex, theme } from 'antd';

// Fills the main area and centres what it holds: an empty state, an error
// or a hint. Flex props pass through, such as `vertical` and `gap`.
const CenteredState = ({
  style,
  ...rest
}: Omit<ComponentProps<typeof Flex>, 'flex' | 'align' | 'justify'>) => {
  const { token } = theme.useToken();
  return (
    <Flex
      flex={1}
      align="center"
      justify="center"
      style={{
        minHeight: 0,
        padding: token.paddingLG,
        overflow: 'auto',
        textAlign: 'center',
        ...style
      }}
      {...rest}
    />
  );
};

export default CenteredState;
