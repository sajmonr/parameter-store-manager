import type { ReactNode } from 'react';
import { Flex, Typography } from 'antd';
import EnvironmentDot from './EnvironmentDot';
import { CountText } from './MetaText';

interface EnvironmentLabelProps {
  // Without a colour, the name shows alone.
  color?: string | null;
  name: ReactNode;
  // A count after the name, as in tabs and column headers.
  count?: number;
  // Whether the count is final (see CountText).
  loaded?: boolean;
  // The name shortens with an ellipsis when space runs out.
  ellipsis?: boolean;
  className?: string;
}

// An environment's colour dot and name, and maybe a count. Inline, so it
// fits in tabs, crumbs and tags; Flex has no inline mode.
const EnvironmentLabel = ({
  color,
  name,
  count,
  loaded,
  ellipsis = false,
  className
}: EnvironmentLabelProps) => (
  <Flex
    component="span"
    align="center"
    gap="small"
    className={className}
    style={{ display: 'inline-flex', minWidth: 0, maxWidth: '100%' }}
  >
    {color && <EnvironmentDot color={color} />}
    {ellipsis ? (
      <Typography.Text ellipsis style={{ color: 'inherit', font: 'inherit' }}>
        {name}
      </Typography.Text>
    ) : (
      name
    )}
    {count !== undefined && <CountText count={count} loaded={loaded} />}
  </Flex>
);

export default EnvironmentLabel;
