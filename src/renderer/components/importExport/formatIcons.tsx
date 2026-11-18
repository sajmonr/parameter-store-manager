import type { ReactNode } from 'react';
import { CodeOutlined, FileTextOutlined } from '@ant-design/icons';
import type { FormatId } from '../../../shared/fileFormats';

export const FORMAT_ICONS: Record<FormatId, ReactNode> = {
  csv: <FileTextOutlined />,
  json: <CodeOutlined />
};
