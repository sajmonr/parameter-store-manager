import React, { useState } from 'react';
import { Empty, Skeleton, Tree } from 'antd';
import { FolderOpenOutlined, FolderOutlined } from '@ant-design/icons';
import { useDispatch, useSelector } from 'react-redux';
import {
  LOAD_STATES,
  selectors as parameterSelectors
} from '../../ducks/parameters';
import { actions as uiActions, selectors as uiSelectors } from '../../ducks/ui';
import useElementSize from '../../hooks/useElementSize';
import HighlightText from '../common/HighlightText';
import styles from './FolderTree.module.css';

const folderIcon = ({ expanded, isLeaf }) =>
  expanded && !isLeaf ? <FolderOpenOutlined /> : <FolderOutlined />;

// Folders of the parameters that match the search, with match counts.
// Selecting a folder scopes the table to it; selecting it again unscopes.
const FolderTree = () => {
  const dispatch = useDispatch();
  const loadState = useSelector(parameterSelectors.getLoadState);
  const tree = useSelector(uiSelectors.getMatchedFolderTree);
  const matcher = useSelector(uiSelectors.getMatcher);
  const scope = useSelector(uiSelectors.getScope);
  const expandedFolders = useSelector(uiSelectors.getExpandedFolders);
  const [ref, { height }] = useElementSize();

  // While searching, every matching branch starts expanded. Expanding or
  // collapsing during a search lasts until the query changes.
  const [searchExpansion, setSearchExpansion] = useState({
    query: '',
    keys: []
  });
  const searching = !!matcher.query;
  let expandedKeys = expandedFolders;
  if (searching) {
    expandedKeys =
      searchExpansion.query === matcher.query
        ? searchExpansion.keys
        : tree.keys;
  }
  const onExpand = keys =>
    searching
      ? setSearchExpansion({ query: matcher.query, keys })
      : dispatch(uiActions.setExpandedFolders(keys));

  const highlight = searching && !matcher.isGlob ? matcher.query : '';

  let content;
  if (loadState === LOAD_STATES.loading) {
    content = (
      <Skeleton
        active
        title={false}
        paragraph={{ rows: 8 }}
        className={styles.skeleton}
      />
    );
  } else if (!tree.roots.length) {
    content = (
      <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No folders" />
    );
  } else {
    content = (
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
          dispatch(uiActions.setScope(node.key === scope ? '' : node.key))
        }
        titleRender={node => (
          <span className={styles.title}>
            <span className={styles.label} title={node.label}>
              <HighlightText text={node.label} highlight={highlight} />
            </span>
            <span className={styles.count}>{node.count}</span>
          </span>
        )}
      />
    );
  }

  return (
    <div ref={ref} className={styles.container}>
      {content}
    </div>
  );
};

export default FolderTree;
