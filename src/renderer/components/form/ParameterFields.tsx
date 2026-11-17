import type { ReactNode } from 'react';
import { Form, Input, Segmented, Tooltip, Typography } from 'antd';
import { LockOutlined } from '@ant-design/icons';
import {
  DEFAULT_KMS_KEY,
  DEFAULT_PARAMETER_TYPE,
  PARAMETER_TYPE,
  isSecureType
} from '../../../shared/parameterTypes';
import type { NewParameterPrefill } from '../../state/ui';
import { DESCRIPTION_PLACEHOLDER, KMS_KEY_LABEL } from '../../utils/labels';
import { MAX_VALUE_LENGTH } from '../../utils/parameterValue';
import KmsKeySelect from './KmsKeySelect';
import type { FormValues } from './useCreateSubmit';
import styles from './ParameterForm.module.css';

const typeOptions = [
  { value: PARAMETER_TYPE.String, label: PARAMETER_TYPE.String },
  {
    value: PARAMETER_TYPE.SecureString,
    label: PARAMETER_TYPE.SecureString,
    icon: <LockOutlined />
  },
  {
    value: PARAMETER_TYPE.StringList,
    label: (
      <Tooltip title="Not supported yet">{PARAMETER_TYPE.StringList}</Tooltip>
    ),
    disabled: true
  }
];

// The fields' starting values: blank, or what a duplicate or a missing
// value brings along.
export const initialValuesOf = (
  prefill: NewParameterPrefill | null
): FormValues => ({
  description: prefill?.description ?? '',
  type: prefill?.type ?? DEFAULT_PARAMETER_TYPE,
  value: prefill?.value ?? '',
  kmsKey: prefill?.kmsKey || DEFAULT_KMS_KEY
});

const optional = (label: ReactNode) => (
  <>
    {label}&nbsp;<Typography.Text type="secondary">(optional)</Typography.Text>
  </>
);

// What the new parameters hold: description, type, KMS key and value.
// They are fields of the surrounding Form.
const ParameterFields = ({
  type,
  several,
  focusValue
}: {
  type: FormValues['type'];
  // Whether the form creates more than one parameter.
  several: boolean;
  focusValue?: boolean;
}) => (
  <>
    <Form.Item name="description" label={optional('Description')}>
      <Input placeholder={DESCRIPTION_PLACEHOLDER} />
    </Form.Item>
    <Form.Item name="type" label="Type" required>
      <Segmented options={typeOptions} />
    </Form.Item>
    {isSecureType(type) && (
      <Form.Item name="kmsKey" label={KMS_KEY_LABEL} required>
        <KmsKeySelect />
      </Form.Item>
    )}
    <Form.Item
      name="value"
      label="Value"
      required
      extra={
        several ? (
          <span className={styles.valueNote}>
            The same value is created in each environment.
          </span>
        ) : undefined
      }
    >
      <Input.TextArea
        className={styles.mono}
        autoSize={{ minRows: 4, maxRows: 12 }}
        showCount
        maxLength={MAX_VALUE_LENGTH}
        autoFocus={focusValue}
      />
    </Form.Item>
  </>
);

export default ParameterFields;
