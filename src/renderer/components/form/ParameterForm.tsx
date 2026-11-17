import { useState } from 'react';
import { Form, Typography } from 'antd';
import { useLocationContext } from '../../state/settings';
import type { NewParameterPrefill } from '../../state/ui';
import { isSubmitShortcut } from '../../utils/keys';
import { isValueValid } from '../../utils/parameterValue';
import PaneHeader from '../detail/PaneHeader';
import CreatePreview from './CreatePreview';
import FormFooter from './FormFooter';
import NamingFields from './NamingFields';
import ParameterFields, { initialValuesOf } from './ParameterFields';
import useCreateSubmit from './useCreateSubmit';
import type { FormValues } from './useCreateSubmit';
import useNaming from './useNaming';
import styles from './ParameterForm.module.css';

// Creates a parameter, or the same key in several environments of a service.
// `prefill` comes from Duplicate or from setting a missing value; without it
// the form starts at the location.
const ParameterForm = ({
  prefill
}: {
  prefill: NewParameterPrefill | null;
}) => {
  const [form] = Form.useForm<FormValues>();
  const { delimiter } = useLocationContext();
  const { submit, submitting, outcome, created, clearOutcome } =
    useCreateSubmit();
  const naming = useNaming(prefill, created, outcome?.failed, clearOutcome);
  const { targets, pending, rows } = naming;

  const [initialValues] = useState(() => initialValuesOf(prefill));
  // useWatch is undefined until the form mounts.
  const value = Form.useWatch('value', form) ?? initialValues.value;
  const type = Form.useWatch('type', form) ?? initialValues.type;

  const ready =
    targets.length > 0 &&
    !naming.blocked &&
    !!pending.length &&
    isValueValid(value);

  const onSubmit = () => {
    if (!ready || submitting) return;
    submit(targets, naming.naming.key, form.getFieldsValue());
  };

  return (
    <>
      <PaneHeader>
        <Typography.Title level={5} style={{ margin: 0 }}>
          {prefill?.source ? 'Duplicate parameter' : 'New parameter'}
        </Typography.Title>
      </PaneHeader>
      <Form
        form={form}
        layout="vertical"
        initialValues={initialValues}
        className={styles.form}
        onKeyDown={event => {
          if (isSubmitShortcut(event)) onSubmit();
        }}
        onFinish={onSubmit}
      >
        <NamingFields naming={naming} />
        {rows.length > 0 && <CreatePreview rows={rows} delimiter={delimiter} />}
        <ParameterFields
          type={type}
          several={targets.length > 1}
          focusValue={prefill?.focusValue}
        />
        <FormFooter
          targets={targets.length}
          failed={outcome?.failed.size ?? 0}
          ready={ready}
          submitting={submitting}
        />
      </Form>
    </>
  );
};

export default ParameterForm;
