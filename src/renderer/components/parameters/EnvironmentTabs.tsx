import { Segmented } from 'antd';
import { uiActions } from '../../state/ui';
import { useLoaded } from '../../state/views';
import type { useEnvironmentTabs } from '../../state/views';
import EnvironmentLabel from '../common/EnvironmentLabel';

// The service's environments, with the matches in each at the selected
// folder (a dash until the first load ends). Switching keeps the service and
// the folder.
const EnvironmentTabs = ({
  tabs,
  env
}: {
  tabs: ReturnType<typeof useEnvironmentTabs>;
  env: string;
}) => {
  const loaded = useLoaded();
  return (
    <Segmented
      aria-label="Environment"
      value={env}
      onChange={value => uiActions.setEnv(String(value))}
      options={tabs.map(({ segment, color, count }) => ({
        value: segment,
        label: (
          <EnvironmentLabel
            color={color}
            name={segment}
            count={count}
            loaded={loaded}
          />
        )
      }))}
    />
  );
};

export default EnvironmentTabs;
