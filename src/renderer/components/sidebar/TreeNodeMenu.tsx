import { useState } from 'react';
import type { ReactNode } from 'react';
import { Dropdown } from 'antd';
import { DeleteOutlined } from '@ant-design/icons';
import { useLocationContext } from '../../state/settings';
import { uiActions } from '../../state/ui';
import { pathFolderOf } from '../../utils/location';
import type { Location } from '../../utils/location';
import useEscape from '../../hooks/useEscape';
import Mono from '../common/Mono';
import styles from './FolderTree.module.css';

interface TreeNodeMenuProps {
  // Where the node goes; its tree is everything listed there.
  location: Location;
  // Shown when the location has no path of its own, like Other paths.
  label: string;
  // See views.useTreeNames.
  treeNames: (location: Location) => string[];
  children: ReactNode;
}

// A sidebar node's right-click menu, at the cursor: its path, and deleting
// its tree.
const TreeNodeMenu = ({
  location,
  label,
  treeNames,
  children
}: TreeNodeMenuProps) => {
  const context = useLocationContext();
  const [open, setOpen] = useState(false);
  // Esc closes the menu, not the pane behind it.
  useEscape(() => setOpen(false), open);

  const path = pathFolderOf(location, context) || label;
  // Counted only while open: a tree has many nodes.
  const names = open ? treeNames(location) : [];

  return (
    <Dropdown
      trigger={['contextMenu']}
      open={open}
      onOpenChange={setOpen}
      styles={{ root: { maxWidth: 360 } }}
      // React events bubble out of the popup's portal to the tree node, which
      // would go to the node on any click in the menu.
      popupRender={menu => (
        <div onClick={event => event.stopPropagation()}>{menu}</div>
      )}
      menu={{
        items: [
          {
            type: 'group',
            key: 'path',
            label: <Mono className={styles.menuPath}>{path}</Mono>
          },
          {
            key: 'delete',
            danger: true,
            icon: <DeleteOutlined />,
            disabled: !names.length,
            label: (
              <span className={styles.menuItem}>
                Delete tree…
                <span className={styles.count}>{names.length}</span>
              </span>
            )
          }
        ],
        onClick: () => {
          setOpen(false);
          uiActions.requestDelete({ kind: 'tree', label: path, names });
        }
      }}
    >
      {children}
    </Dropdown>
  );
};

export default TreeNodeMenu;
