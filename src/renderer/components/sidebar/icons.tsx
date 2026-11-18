import { FolderOpenOutlined, FolderOutlined } from '@ant-design/icons';

// A tree node's folder icon, open while it's expanded.
export const folderIcon = ({
  expanded,
  isLeaf
}: {
  expanded?: boolean;
  isLeaf?: boolean;
}) => (expanded && !isLeaf ? <FolderOpenOutlined /> : <FolderOutlined />);
