import { Badge, Button } from 'antd';
import { DeleteOutlined } from '@ant-design/icons';
import { uiActions } from '../../state/ui';
import styles from './ParameterBreadcrumb.module.css';

// The actions for the checked rows, shown while there are any. Move and Copy
// to environment will join Delete here.
const SelectionBar = ({ checked }: { checked: string[] }) => {
  if (!checked.length) return null;
  return (
    <div role="toolbar" aria-label="Selection" className={styles.selection}>
      <Button type="text" onClick={uiActions.clearChecked}>
        Clear
      </Button>
      <Badge count={checked.length} size="small" overflowCount={9999}>
        <Button
          danger
          icon={<DeleteOutlined />}
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
      </Badge>
    </div>
  );
};

export default SelectionBar;
