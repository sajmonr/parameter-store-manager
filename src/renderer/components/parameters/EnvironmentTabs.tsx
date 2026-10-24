import { Segmented } from 'antd';
import { uiActions } from '../../state/ui';
import type { useEnvironmentTabs } from '../../state/views';
import EnvironmentDot from '../common/EnvironmentDot';
import styles from './ParameterBreadcrumb.module.css';

// The service's environments, with the matches in each at the selected
// folder. Switching keeps the service and the folder.
const EnvironmentTabs = ({
  tabs,
  env
}: {
  tabs: ReturnType<typeof useEnvironmentTabs>;
  env: string;
}) => (
  <Segmented
    aria-label="Environment"
    value={env}
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
);

export default EnvironmentTabs;
