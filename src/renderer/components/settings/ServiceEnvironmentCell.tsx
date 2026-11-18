import { Checkbox, Flex } from 'antd';
import type { StructuredNames } from '../../utils/structure';
import { countAt } from '../../utils/structure';
import { OTHER_PATHS_LABEL } from '../../utils/labels';
import styles from './Settings.module.css';

// Whether a service is in an environment, and how many of its parameters
// are there: listed under it when checked, under Other paths when not.
const ServiceEnvironmentCell = ({
  service,
  env,
  checked,
  counts: { byServiceEnv, inOther },
  onChange
}: {
  service: string;
  env: string;
  checked: boolean;
  counts: Pick<StructuredNames, 'byServiceEnv' | 'inOther'>;
  onChange: (checked: boolean) => void;
}) => {
  const count = countAt(checked ? byServiceEnv : inOther, service, env);
  return (
    <Flex gap="small" align="center">
      <Checkbox
        checked={checked}
        aria-label={`${service} in ${env}`}
        onChange={event => onChange(event.target.checked)}
      />
      {checked ? (
        <span className={styles.count}>{count}</span>
      ) : (
        count > 0 && (
          <span className={styles.inOther}>
            {count} in {OTHER_PATHS_LABEL}
          </span>
        )
      )}
    </Flex>
  );
};

export default ServiceEnvironmentCell;
