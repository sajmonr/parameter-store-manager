import { Segmented } from 'antd';
import { uiActions } from '../../state/ui';
import { useLocation } from '../../state/views';
import type { LocationView } from '../../utils/location';
import { viewOptions } from '../../utils/labels';
import styles from './Sidebar.module.css';

const TOOLTIPS: Record<LocationView, string> = {
  services: 'Group by service, switch environments with tabs',
  environments: 'Group by environment',
  paths: 'Full path tree'
};

const options = viewOptions.map(option => ({
  ...option,
  tooltip: TOOLTIPS[option.value]
}));

// Shown only while grouping is on; otherwise the view is always Paths.
const ViewSwitcher = () => {
  const { view } = useLocation();
  return (
    <div className={styles.switcher}>
      <Segmented<LocationView>
        block
        size="small"
        options={options}
        value={view}
        onChange={uiActions.setView}
        aria-label="View"
      />
    </div>
  );
};

export default ViewSwitcher;
