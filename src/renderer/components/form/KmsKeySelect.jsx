import React, { useEffect } from 'react';
import PropTypes from 'prop-types';
import { Flex, Select, Typography } from 'antd';
import { useDispatch, useSelector } from 'react-redux';
import {
  actions as parameterActions,
  selectors as parameterSelectors
} from '../../ducks/parameters';
import Mono from '../common/Mono';

export const DEFAULT_KMS_KEY = 'alias/aws/ssm';

const isAwsManaged = alias => alias.startsWith('alias/aws/');

const KmsKeySelect = ({ value, onChange, ...rest }) => {
  const dispatch = useDispatch();
  const keys = useSelector(parameterSelectors.getKmsKeys);
  const loading = useSelector(parameterSelectors.getIsKmsKeyLoading);
  const loaded = useSelector(parameterSelectors.getIsKmsKeyLoaded);

  useEffect(() => {
    if (!loaded) dispatch(parameterActions.fetchKmsKeys());
  }, [dispatch, loaded]);

  // The default and current keys are listed even before the aliases load.
  const aliases = [
    ...new Set([
      DEFAULT_KMS_KEY,
      ...(value ? [value] : []),
      ...keys.map(key => key.AliasName)
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
      loading={!!loading}
      showSearch
      optionFilterProp="value"
      {...rest}
    />
  );
};

KmsKeySelect.propTypes = {
  onChange: PropTypes.func,
  value: PropTypes.string
};

export default KmsKeySelect;
