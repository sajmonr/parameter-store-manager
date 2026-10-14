import React, { useMemo } from 'react';
import PropTypes from 'prop-types';
import { TreeSelect } from 'antd';
import { FolderOutlined } from '@ant-design/icons';
import { useSelector } from 'react-redux';
import { selectors as settingsSelectors } from '../../ducks/settings';
import { selectors as uiSelectors } from '../../ducks/ui';
import { foldersOf, rootFolder } from '../../utils/paths';
import Mono from '../common/Mono';
import styles from './FolderPicker.module.css';

// Left-to-right marks keep the delimiters in place while the selection is
// laid out right-to-left, which truncates long paths from the left.
const ltr = text => `‎${text}‎`;

// Picks the folder of a new parameter from the existing folders.
const FolderPicker = ({ value, onChange, ...rest }) => {
  const delimiter = useSelector(settingsSelectors.getPathDelimiter);
  const { roots } = useSelector(uiSelectors.getAllFolderTree);
  const root = rootFolder(delimiter);

  const treeData = useMemo(() => {
    const toOption = node => ({
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
      treeNodeFilterProp="value"
      treeDefaultExpandedKeys={[root, ...foldersOf(value || '', delimiter)]}
      showSearch
      prefix={<FolderOutlined />}
      popupMatchSelectWidth={320}
      aria-label="Folder"
      {...rest}
    />
  );
};

FolderPicker.propTypes = {
  onChange: PropTypes.func,
  value: PropTypes.string
};

export default FolderPicker;
