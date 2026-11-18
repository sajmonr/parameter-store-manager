import { Checkbox, Flex } from 'antd';
import type { StructuredNames } from '../../utils/structure';
import { countAt } from '../../utils/structure';
import { OTHER_PATHS_LABEL } from '../../utils/labels';
import { CountText } from '../common/MetaText';
import HintText from '../common/HintText';

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
        <CountText count={count} tone="secondary" />
      ) : (
        count > 0 && (
          <HintText type="warning">
            {count} in {OTHER_PATHS_LABEL}
          </HintText>
        )
      )}
    </Flex>
  );
};

export default ServiceEnvironmentCell;
