import { useMemo } from 'react';
import { Empty, Tree } from 'antd';
import type { TreeDataNode } from 'antd';
import { AppstoreOutlined, InboxOutlined } from '@ant-design/icons';
import { uiActions } from '../../state/ui';
import { useLocation, useServicesTree } from '../../state/views';
import { isServiceLocation, treeKeyOf } from '../../utils/location';
import type { Location } from '../../utils/location';
import type { SidebarNode } from '../../utils/servicesTree';
import HighlightText from '../common/HighlightText';
import { folderIcon } from './FolderTree';
import useTreeExpansion from './useTreeExpansion';
import styles from './FolderTree.module.css';

type ServicesTreeNode = SidebarNode &
  TreeDataNode & { children: ServicesTreeNode[] };

const icons = {
  service: <AppstoreOutlined />,
  other: <InboxOutlined />,
  folder: folderIcon
};

const withIcons = (nodes: SidebarNode[]): ServicesTreeNode[] =>
  nodes.map(node => ({
    ...node,
    icon: icons[node.kind],
    children: withIcons(node.children)
  }));

// One group of the Services sidebar. Clicking a node goes there; the caret
// only expands or collapses it.
const Group = ({
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
  return (
    <>
      <div className={styles.group}>{title}</div>
      <Tree<ServicesTreeNode>
        blockNode
        showIcon
        treeData={treeData}
        expandedKeys={expandedKeys}
        onExpand={onExpand}
        selectedKeys={[selectedKey]}
        onSelect={(_keys, { node }) => onSelect(node.location)}
        titleRender={node => (
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
                node.count ? styles.count : `${styles.count} ${styles.empty}`
              }
            >
              {node.count}
            </span>
          </span>
        )}
      />
    </>
  );
};

// The Services view: each service with its folders, counted in the
// environment it opens on, then the names that don't fit the structure.
const ServicesTree = () => {
  const tree = useServicesTree();
  const location = useLocation();
  const expansion = useTreeExpansion('services', tree.keys);
  const selectedKey = treeKeyOf(location);
  // Another service opens on the environment picked before, or falls back
  // to one it's in; that fallback isn't a new pick.
  const onSelect = (next: Location) => {
    const otherService =
      isServiceLocation(next) &&
      !(isServiceLocation(location) && location.service === next.service);
    uiActions.setLocation(next, { rememberEnv: !otherService });
  };
  const other = useMemo(() => (tree.other ? [tree.other] : []), [tree.other]);

  return (
    <div className={`${styles.container} ${styles.scroll}`}>
      {tree.services.length > 0 && (
        <Group
          title="Services"
          nodes={tree.services}
          selectedKey={selectedKey}
          expansion={expansion}
          onSelect={onSelect}
        />
      )}
      {other.length > 0 && (
        <Group
          title="Unstructured"
          nodes={other}
          selectedKey={selectedKey}
          expansion={expansion}
          onSelect={onSelect}
        />
      )}
      {!tree.services.length && !other.length && (
        <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No folders" />
      )}
    </div>
  );
};

export default ServicesTree;
