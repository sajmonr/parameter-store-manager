import { Segmented } from 'antd';
import { uiActions } from '../../state/ui';
import { useEnvironmentTabs, useLocation } from '../../state/views';
import { isServiceLocation } from '../../utils/location';
import EnvironmentDot from '../common/EnvironmentDot';
import styles from './ParameterBreadcrumb.module.css';

// The selected service's environments, with the matches in each at the
// selected folder. Switching keeps the service and the folder.
const EnvironmentTabs = () => {
  const location = useLocation();
  const tabs = useEnvironmentTabs();
  if (!isServiceLocation(location) || !tabs.length) return null;

  return (
    <div className={styles.tabs}>
      <Segmented
        aria-label="Environment"
        value={location.env}
        onChange={value => uiActions.setEnv(String(value))}
        options={tabs.map(({ segment, color, count }) => ({
          value: segment,
          label: (
            <span className={styles.env}>
              <EnvironmentDot color={color} />
              {segment}
              <span className={styles.tabCount}>{count}</span>
            </span>
          )
        }))}
      />
    </div>
  );
};

export default EnvironmentTabs;
