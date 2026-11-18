import { Checkbox, Flex, Input, Typography } from 'antd';
import { SearchOutlined } from '@ant-design/icons';
import { plural } from '../../utils/plural';
import type { selectAllState } from '../../utils/copyValue';
import styles from './CopyModal.module.css';

interface CopyToolbarProps {
  allState: ReturnType<typeof selectAllState>;
  onSelectAll: (checked: boolean) => void;
  selected: number;
  selectable: number;
  // Shows the filter; short lists have none.
  filtering: boolean;
  filter: string;
  onFilter: (filter: string) => void;
  disabled: boolean;
}

// Select all, how many are selected, and the filter of long lists.
const CopyToolbar = ({
  allState,
  onSelectAll,
  selected,
  selectable,
  filtering,
  filter,
  onFilter,
  disabled
}: CopyToolbarProps) => (
  <Flex align="center" gap="var(--ant-margin-sm)" className={styles.toolbar}>
    <Checkbox
      checked={allState.checked}
      indeterminate={allState.indeterminate}
      disabled={!allState.selectable.length || disabled}
      onChange={event => onSelectAll(event.target.checked)}
    >
      Select all
    </Checkbox>
    <Typography.Text type="secondary">
      {selected} of {plural(selectable, 'environment')} selected
    </Typography.Text>
    {filtering && (
      <Input
        allowClear
        size="small"
        prefix={<SearchOutlined />}
        placeholder="Filter environments"
        aria-label="Filter environments"
        value={filter}
        onChange={event => onFilter(event.target.value)}
        className={styles.filter}
      />
    )}
  </Flex>
);

export default CopyToolbar;
