import { Flex, Select } from 'antd';
import type { SelectProps } from 'antd';
import { useKmsAliases } from '../../state/kms';
import { DEFAULT_KMS_KEY } from '../../../shared/parameterTypes';
import { isAwsManaged } from '../../utils/kms';
import Mono from '../common/Mono';
import MetaText from '../common/MetaText';

type KmsKeySelectProps = SelectProps<string> & {
  // Keys to list even when they aren't selected or don't have an alias.
  include?: string[];
};

// Form.Item passes the value and onChange.
const KmsKeySelect = ({
  value,
  onChange,
  include = [],
  ...rest
}: KmsKeySelectProps) => {
  const { data: keys = [], isFetching: loading } = useKmsAliases();

  // The default and current keys are listed even before the aliases load.
  const aliases = [
    ...new Set([
      DEFAULT_KMS_KEY,
      ...include,
      ...(value ? [value] : []),
      ...keys.flatMap(key => (key.AliasName ? [key.AliasName] : []))
    ])
  ].sort();

  const options = aliases.map(alias => ({
    value: alias,
    label: (
      <Flex justify="space-between" gap="small">
        <Mono ellipsis>{alias}</Mono>
        {isAwsManaged(alias) && <MetaText>AWS managed</MetaText>}
      </Flex>
    )
  }));

  return (
    <Select
      value={value}
      onChange={onChange}
      options={options}
      loading={loading}
      showSearch={{ optionFilterProp: 'value' }}
      {...rest}
    />
  );
};

export default KmsKeySelect;
