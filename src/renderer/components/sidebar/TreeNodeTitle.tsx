import { Flex } from 'antd';
import { COUNT_PLACEHOLDER } from '../../utils/labels';
import type { Location } from '../../utils/location';
import { cx } from '../../utils/classNames';
import EnvironmentDot from '../common/EnvironmentDot';
import HighlightText from '../common/HighlightText';
import TreeNodeMenu from './TreeNodeMenu';
import styles from './FolderTree.module.css';

interface TreeNodeTitleProps {
  location: Location;
  label: string;
  // The names under the node, for its delete menu.
  treeNames: (location: Location) => string[];
  count: number;
  // Until the first load ends, the count is a placeholder.
  loaded?: boolean;
  // An environment folder's colour.
  color?: string | null;
  // The search text to highlight in the label; none for fixed labels.
  highlight?: string;
}

// A sidebar node: its label, maybe a colour dot, and its count at the right
// edge. Right-clicking it opens its menu.
const TreeNodeTitle = ({
  location,
  label,
  treeNames,
  count,
  loaded = true,
  color,
  highlight
}: TreeNodeTitleProps) => (
  <TreeNodeMenu location={location} label={label} treeNames={treeNames}>
    <Flex
      component="span"
      align="baseline"
      gap="small"
      className={styles.title}
    >
      {color && <EnvironmentDot color={color} className={styles.dot} />}
      <span className={styles.label} title={label}>
        {highlight === undefined ? (
          label
        ) : (
          <HighlightText text={label} highlight={highlight} />
        )}
      </span>
      <span className={cx(styles.count, (!loaded || !count) && styles.empty)}>
        {loaded ? count : COUNT_PLACEHOLDER}
      </span>
    </Flex>
  </TreeNodeMenu>
);

export default TreeNodeTitle;
