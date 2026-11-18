import { Empty, Tree } from 'antd';
import { useLocationContext } from '../../state/settings';
import { uiActions } from '../../state/ui';
import {
  useLocation,
  useMatchedFolderTree,
  useTreeNames
} from '../../state/views';
import useElementSize from '../../hooks/useElementSize';
import { environmentColorOf } from '../../utils/structure';
import { folderIcon } from './icons';
import useTreeExpansion from './useTreeExpansion';
import styles from './FolderTree.module.css';
import TreeNodeTitle from './TreeNodeTitle';

// The Paths view: folders of the parameters that match the search, with
// match counts. Selecting a folder scopes the table to it; selecting it again
// unscopes. With grouping on, environment folders get their colour.
// Right-clicking one offers to delete its tree.
const FolderTree = () => {
  const tree = useMatchedFolderTree();
  const location = useLocation();
  const { structure, delimiter } = useLocationContext();
  const scope = location.view === 'paths' ? location.scope : '';
  const { expandedKeys, onExpand, highlight } = useTreeExpansion(
    'paths',
    tree.keys
  );
  const [ref, { height }] = useElementSize();
  const treeNames = useTreeNames();

  return (
    <div ref={ref} className={styles.container}>
      {tree.roots.length ? (
        <Tree
          blockNode
          showIcon
          icon={folderIcon}
          treeData={tree.roots}
          height={height || undefined}
          expandedKeys={expandedKeys}
          onExpand={onExpand}
          selectedKeys={[scope]}
          onSelect={(_keys, { node }) =>
            uiActions.setScope(node.key === scope ? '' : node.key)
          }
          titleRender={node => {
            const color = environmentColorOf(node.key, structure, delimiter);
            return (
              <TreeNodeTitle
                location={{ view: 'paths', scope: node.key }}
                label={node.label}
                treeNames={treeNames}
                count={node.count}
                color={color}
                highlight={highlight}
              />
            );
          }}
        />
      ) : (
        <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No folders" />
      )}
    </div>
  );
};

export default FolderTree;
