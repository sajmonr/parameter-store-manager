import type { ReactNode } from 'react';
import { Flex, Typography } from 'antd';

// A labelled part of the "What to export" card.
const ExportSection = ({
  label,
  children
}: {
  label: string;
  children: ReactNode;
}) => (
  <Flex vertical gap={8}>
    <Typography.Text strong>{label}</Typography.Text>
    {children}
  </Flex>
);

export default ExportSection;
