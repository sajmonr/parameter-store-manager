import { useMemo } from 'react';
import { Empty } from 'antd';
import { uiActions } from '../../state/ui';
import { useEnvironmentsTree, useLocation } from '../../state/views';
import { treeKeyOf } from '../../utils/location';
import type { Location } from '../../utils/location';
import SidebarGroup from './SidebarGroup';
import useTreeExpansion from './useTreeExpansion';
import styles from './FolderTree.module.css';

// The Environments view: each environment with the services in it and their
// folders, then the names that don't fit the structure.
const EnvironmentsTree = () => {
  const tree = useEnvironmentsTree();
  const location = useLocation();
  const expansion = useTreeExpansion('environments', tree.keys);
  const selectedKey = treeKeyOf(location);
  const onSelect = (next: Location) => uiActions.setLocation(next);
  const other = useMemo(() => (tree.other ? [tree.other] : []), [tree.other]);

  return (
    <div className={`${styles.container} ${styles.scroll}`}>
      {tree.environments.length > 0 && (
        <SidebarGroup
          title="Environments"
          nodes={tree.environments}
          selectedKey={selectedKey}
          expansion={expansion}
          onSelect={onSelect}
        />
      )}
      {other.length > 0 && (
        <SidebarGroup
          title="Unstructured"
          nodes={other}
          selectedKey={selectedKey}
          expansion={expansion}
          onSelect={onSelect}
        />
      )}
      {!tree.environments.length && !other.length && (
        <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No folders" />
      )}
    </div>
  );
};

export default EnvironmentsTree;
