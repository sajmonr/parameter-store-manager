import { Segmented } from 'antd';
import { uiActions } from '../../state/ui';
import { useLocation } from '../../state/views';
import type { LocationView } from '../../utils/location';
import styles from './Sidebar.module.css';

const options = [
  {
    value: 'services',
    label: 'Services',
    tooltip: 'Group by service, switch environments with tabs'
  },
  {
    value: 'environments',
    label: 'Environments',
    tooltip: 'Group by environment'
  },
  { value: 'paths', label: 'Paths', tooltip: 'Full path tree' }
];

// Shown only while grouping is on; otherwise the view is always Paths.
const ViewSwitcher = () => {
  const { view } = useLocation();
  return (
    <div className={styles.switcher}>
      <Segmented
        block
        size="small"
        options={options}
        value={view}
        onChange={value => uiActions.setView(value as LocationView)}
        aria-label="View"
      />
    </div>
  );
};

export default ViewSwitcher;
