import { useMemo } from 'react';
import { Empty } from 'antd';
import { uiActions } from '../../state/ui';
import { useLocation, useServicesTree } from '../../state/views';
import { isServiceLocation, treeKeyOf } from '../../utils/location';
import type { Location } from '../../utils/location';
import SidebarGroup from './SidebarGroup';
import useTreeExpansion from './useTreeExpansion';
import styles from './FolderTree.module.css';
import { OTHER_PATHS_LABEL, VIEW_LABELS } from '../../utils/labels';
import { cx } from '../../utils/classNames';

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
    <div className={cx(styles.container, styles.scroll)}>
      {tree.services.length > 0 && (
        <SidebarGroup
          title={VIEW_LABELS.services}
          nodes={tree.services}
          selectedKey={selectedKey}
          expansion={expansion}
          onSelect={onSelect}
        />
      )}
      {other.length > 0 && (
        <SidebarGroup
          title={OTHER_PATHS_LABEL}
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
