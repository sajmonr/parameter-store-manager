import {
  useCompareMode,
  useEnvironmentTabs,
  useLocation
} from '../../state/views';
import type { Comparison } from '../../utils/compare';
import { isServiceLocation } from '../../utils/location';
import CompareFilterTabs from './CompareFilterTabs';
import EnvironmentTabs from './EnvironmentTabs';
import ModeSwitch from './ModeSwitch';
import styles from './ParameterBreadcrumb.module.css';

// A service's second breadcrumb row: its environment tabs, or the compare
// filter while comparing, and the switch between the two. The tabs scroll
// sideways when they don't fit; the switch stays put.
const ServiceBar = ({ comparison }: { comparison: Comparison | null }) => {
  const location = useLocation();
  const tabs = useEnvironmentTabs();
  const compare = useCompareMode();
  if (!isServiceLocation(location) || !tabs.length) return null;

  return (
    <div className={styles.serviceBar}>
      <div className={styles.tabs}>
        {compare && comparison ? (
          <CompareFilterTabs comparison={comparison} />
        ) : (
          <EnvironmentTabs tabs={tabs} env={location.env} />
        )}
      </div>
      <ModeSwitch compare={compare} />
    </div>
  );
};

export default ServiceBar;
