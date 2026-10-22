import { Empty, Tree } from 'antd';
import { FolderOpenOutlined, FolderOutlined } from '@ant-design/icons';
import { useLocationContext } from '../../state/settings';
import { uiActions } from '../../state/ui';
import { useLocation, useMatchedFolderTree } from '../../state/views';
import useElementSize from '../../hooks/useElementSize';
import { environmentColorOf } from '../../utils/structure';
import EnvironmentDot from '../common/EnvironmentDot';
import HighlightText from '../common/HighlightText';
import useTreeExpansion from './useTreeExpansion';
import styles from './FolderTree.module.css';

export const folderIcon = ({
  expanded,
  isLeaf
}: {
  expanded?: boolean;
  isLeaf?: boolean;
}) => (expanded && !isLeaf ? <FolderOpenOutlined /> : <FolderOutlined />);

// The Paths view: folders of the parameters that match the search, with
// match counts. Selecting a folder scopes the table to it; selecting it again
// unscopes. With grouping on, environment folders get their colour.
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
              <span className={styles.title}>
                {color && (
                  <EnvironmentDot color={color} className={styles.dot} />
                )}
                <span className={styles.label} title={node.label}>
                  <HighlightText text={node.label} highlight={highlight} />
                </span>
                <span className={styles.count}>{node.count}</span>
              </span>
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
