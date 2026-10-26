import { useMemo } from 'react';
import { Tree } from 'antd';
import type { TreeDataNode } from 'antd';
import { AppstoreOutlined, InboxOutlined } from '@ant-design/icons';
import { useLoaded, useTreeNames } from '../../state/views';
import type { Location } from '../../utils/location';
import type { SidebarNode } from '../../utils/servicesTree';
import EnvironmentDot from '../common/EnvironmentDot';
import HighlightText from '../common/HighlightText';
import { folderIcon } from './FolderTree';
import TreeNodeMenu from './TreeNodeMenu';
import type useTreeExpansion from './useTreeExpansion';
import styles from './FolderTree.module.css';

type GroupTreeNode = SidebarNode & TreeDataNode & { children: GroupTreeNode[] };

const iconOf = (node: SidebarNode) => {
  switch (node.kind) {
    case 'environment':
      return <EnvironmentDot color={node.color ?? ''} />;
    case 'service':
      return <AppstoreOutlined />;
    case 'other':
      return <InboxOutlined />;
    default:
      return folderIcon;
  }
};

const withIcons = (nodes: SidebarNode[]): GroupTreeNode[] =>
  nodes.map(node => ({
    ...node,
    icon: iconOf(node),
    children: withIcons(node.children)
  }));

// One group of a grouped view's sidebar. Clicking a node goes there; the
// caret only expands or collapses it. Right-clicking offers to delete its
// tree, as the node shows it (a service in its current environment).
const SidebarGroup = ({
  title,
  nodes,
  selectedKey,
  expansion,
  onSelect
}: {
  title: string;
  nodes: SidebarNode[];
  selectedKey: string;
  expansion: ReturnType<typeof useTreeExpansion>;
  onSelect: (location: Location) => void;
}) => {
  const treeData = useMemo(() => withIcons(nodes), [nodes]);
  const { expandedKeys, onExpand, highlight } = expansion;
  const treeNames = useTreeNames();
  // Counts would keep rolling during the first load: a dash until it ends.
  const loaded = useLoaded();
  return (
    <>
      <div className={styles.group}>{title}</div>
      <Tree<GroupTreeNode>
        blockNode
        showIcon
        treeData={treeData}
        expandedKeys={expandedKeys}
        onExpand={onExpand}
        selectedKeys={[selectedKey]}
        onSelect={(_keys, { node }) => onSelect(node.location)}
        titleRender={node => (
          <TreeNodeMenu
            location={node.location}
            label={node.label}
            treeNames={treeNames}
          >
            <span className={styles.title}>
              <span className={styles.label} title={node.label}>
                {node.kind === 'other' ? (
                  node.label
                ) : (
                  <HighlightText text={node.label} highlight={highlight} />
                )}
              </span>
              <span
                className={
                  loaded && node.count
                    ? styles.count
                    : `${styles.count} ${styles.empty}`
                }
              >
                {loaded ? node.count : '–'}
              </span>
            </span>
          </TreeNodeMenu>
        )}
      />
    </>
  );
};

export default SidebarGroup;
