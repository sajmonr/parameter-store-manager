import { Button, Tooltip } from 'antd';
import { CloseOutlined } from '@ant-design/icons';
import { uiActions } from '../../state/ui';
import styles from './SelectionBar.module.css';
import NeutralBadge from '../common/NeutralBadge';

// The actions for the checked rows, in a small card at the end of the
// breadcrumb row while there are any. Move and Copy to environment will join
// Delete here.
const SelectionBar = ({ checked }: { checked: string[] }) => {
  if (!checked.length) return null;
  return (
    <NeutralBadge solid count={checked.length} overflowCount={9999}>
      <div role="toolbar" aria-label="Selection" className={styles.bar}>
        <Tooltip title="Clear selection">
          <Button
            type="text"
            size="small"
            icon={<CloseOutlined />}
            aria-label="Clear selection"
            onClick={uiActions.clearChecked}
          />
        </Tooltip>
        <Button
          type="text"
          danger
          size="small"
          onClick={() =>
            uiActions.requestDelete({
              kind: 'selection',
              label: '',
              names: checked
            })
          }
        >
          Delete
        </Button>
      </div>
    </NeutralBadge>
  );
};

export default SelectionBar;
