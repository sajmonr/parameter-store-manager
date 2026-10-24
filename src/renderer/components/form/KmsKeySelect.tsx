import { Flex, Select, Typography } from 'antd';
import type { SelectProps } from 'antd';
import { useKmsAliases } from '../../state/kms';
import { DEFAULT_KMS_KEY } from '../../../main/endpoints/parameters/putParameter/putParameter.contract';
import Mono from '../common/Mono';

const isAwsManaged = (alias: string) => alias.startsWith('alias/aws/');

// Form.Item passes the value and onChange.
const KmsKeySelect = ({ value, onChange, ...rest }: SelectProps<string>) => {
  const { data: keys = [], isFetching: loading } = useKmsAliases();

  // The default and current keys are listed even before the aliases load.
  const aliases = [
    ...new Set([
      DEFAULT_KMS_KEY,
      ...(value ? [value] : []),
      ...keys.flatMap(key => (key.AliasName ? [key.AliasName] : []))
    ])
  ].sort();

  const options = aliases.map(alias => ({
    value: alias,
    label: (
      <Flex justify="space-between" gap={8}>
        <Mono ellipsis>{alias}</Mono>
        {isAwsManaged(alias) && (
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            AWS managed
          </Typography.Text>
        )}
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
