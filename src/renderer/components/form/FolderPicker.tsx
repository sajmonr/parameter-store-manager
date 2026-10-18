import { useMemo } from 'react';
import type { ReactNode } from 'react';
import { TreeSelect } from 'antd';
import type { TreeSelectProps } from 'antd';
import { FolderOutlined } from '@ant-design/icons';
import { usePathDelimiter } from '../../state/settings';
import { useAllFolderTree } from '../../state/views';
import { foldersOf, rootFolder } from '../../utils/paths';
import type { FolderNode } from '../../utils/paths';
import Mono from '../common/Mono';
import styles from './FolderPicker.module.css';

interface FolderOption {
  value: string;
  title: ReactNode;
  // Shown in the box once picked.
  display: string;
  children: FolderOption[];
}

// Left-to-right marks keep the delimiters in place while the selection is
// laid out right-to-left, which truncates long paths from the left.
const ltr = (text: string) => `‎${text}‎`;

// Picks the folder of a new parameter from the existing folders. Form.Item
// passes the value and onChange.
const FolderPicker = ({
  value,
  onChange,
  ...rest
}: TreeSelectProps<string>) => {
  const delimiter = usePathDelimiter();
  const { roots } = useAllFolderTree();
  const root = rootFolder(delimiter);

  const treeData = useMemo(() => {
    const toOption = (node: FolderNode): FolderOption => ({
      value: node.key,
      title: <Mono>{`${node.label}${delimiter}`}</Mono>,
      display: ltr(node.key),
      children: node.children.map(toOption)
    });
    const rootLabel = root || '(top level)';
    return [
      {
        value: root,
        title: <Mono>{rootLabel}</Mono>,
        display: ltr(rootLabel),
        children: roots.map(toOption)
      }
    ];
  }, [roots, delimiter, root]);

  return (
    <TreeSelect
      className={styles.picker}
      value={value}
      onChange={onChange}
      treeData={treeData}
      treeNodeLabelProp="display"
      treeDefaultExpandedKeys={[root, ...foldersOf(value || '', delimiter)]}
      showSearch={{ treeNodeFilterProp: 'value' }}
      prefix={<FolderOutlined />}
      popupMatchSelectWidth={320}
      aria-label="Folder"
      {...rest}
    />
  );
};

export default FolderPicker;
