import { useState } from 'react';
import {
  App,
  Button,
  Flex,
  Form,
  Input,
  Segmented,
  Space,
  Tooltip,
  Typography
} from 'antd';
import { LockOutlined } from '@ant-design/icons';
import type { ReactNode } from 'react';
import { DEFAULT_KMS_KEY } from '../../../main/endpoints/parameters/putParameter/putParameter.contract';
import type { EditableParameterType } from '../../../main/endpoints/parameters/putParameter/putParameter.contract';
import { usePutParameter } from '../../state/parameters';
import { usePathDelimiter } from '../../state/settings';
import { uiActions } from '../../state/ui';
import type { NewParameterPrefill } from '../../state/ui';
import { useLocationPath, useNameSet } from '../../state/views';
import { rootFolder } from '../../utils/paths';
import {
  checkNewParameter,
  MAX_VALUE_LENGTH,
  NAME_ERRORS
} from '../../utils/newParameter';
import { isSubmitShortcut, submitShortcutLabel } from '../../utils/keys';
import BreakablePath from '../common/BreakablePath';
import Mono from '../common/Mono';
import PaneHeader from '../detail/PaneHeader';
import FolderPicker from './FolderPicker';
import KmsKeySelect from './KmsKeySelect';
import styles from './ParameterForm.module.css';

const typeOptions = [
  { value: 'String', label: 'String' },
  { value: 'SecureString', label: 'SecureString', icon: <LockOutlined /> },
  {
    value: 'StringList',
    label: <Tooltip title="Not supported yet">StringList</Tooltip>,
    disabled: true
  }
];

interface FormValues {
  folder: string;
  name: string;
  description: string;
  type: EditableParameterType;
  kmsKey: string;
  value: string;
}

const optional = (label: ReactNode) => (
  <>
    {label}&nbsp;<Typography.Text type="secondary">(optional)</Typography.Text>
  </>
);

// Creates one parameter. `prefill` comes from Duplicate; without it the form
// starts empty in the location's folder.
const ParameterForm = ({
  prefill
}: {
  prefill: NewParameterPrefill | null;
}) => {
  const { notification } = App.useApp();
  const [form] = Form.useForm<FormValues>();
  const delimiter = usePathDelimiter();
  const locationPath = useLocationPath();
  const existingNames = useNameSet();
  const putParameter = usePutParameter();
  const submitting = putParameter.isPending;

  const [initialValues] = useState<FormValues>(() => ({
    folder: locationPath || rootFolder(delimiter),
    name: '',
    description: '',
    type: 'String',
    value: '',
    ...prefill,
    kmsKey: (prefill && prefill.kmsKey) || DEFAULT_KMS_KEY
  }));

  // useWatch is undefined until the form mounts.
  const folder = Form.useWatch('folder', form) ?? initialValues.folder;
  const name = Form.useWatch('name', form) ?? initialValues.name;
  const value = Form.useWatch('value', form) ?? initialValues.value;
  const type = Form.useWatch('type', form) ?? initialValues.type;

  const check = checkNewParameter(
    { folder, name, value },
    existingNames,
    delimiter
  );

  const nameHelp =
    check.nameError &&
    {
      [NAME_ERRORS.characters]: 'Use letters, digits, _ . and - only.',
      [NAME_ERRORS.emptySegment]: `Folder names can't be empty: remove the extra ${delimiter}.`,
      [NAME_ERRORS.exists]: (
        <>
          This name already exists.{' '}
          <Typography.Link
            onClick={() => uiActions.selectParameter(check.fullPath)}
          >
            Open it
          </Typography.Link>{' '}
          to edit instead.
        </>
      )
    }[check.nameError];

  const submit = () => {
    if (!check.ready || submitting) return;
    const values = form.getFieldsValue();
    putParameter
      .mutateAsync({
        name: check.fullPath,
        description: values.description,
        type: values.type,
        kmsKey: values.kmsKey,
        value: values.value,
        overwrite: false
      })
      .then(() => {
        notification.success({
          title: 'Parameter created',
          description: check.fullPath
        });
        uiActions.showCreatedParameter(check.fullPath);
      })
      .catch(err => {
        notification.error({
          title: 'Parameter was not created',
          description: err.message || ''
        });
      });
  };

  return (
    <>
      <PaneHeader>
        <Typography.Title level={5} style={{ margin: 0 }}>
          {prefill ? 'Duplicate parameter' : 'New parameter'}
        </Typography.Title>
      </PaneHeader>
      <Form
        form={form}
        layout="vertical"
        initialValues={initialValues}
        className={styles.form}
        onKeyDown={event => {
          if (isSubmitShortcut(event)) submit();
        }}
        onFinish={submit}
      >
        <Form.Item
          label="Name"
          required
          validateStatus={check.nameError ? 'error' : undefined}
          help={nameHelp}
          extra={
            <Mono type="secondary" size={12} className={styles.path}>
              <BreakablePath path={check.fullPath} delimiter={delimiter} />
            </Mono>
          }
        >
          <Space.Compact block style={{ display: 'flex' }}>
            <Form.Item name="folder" noStyle>
              <FolderPicker />
            </Form.Item>
            <Form.Item name="name" noStyle>
              <Input
                className={`${styles.mono} ${styles.name}`}
                placeholder={`Name, or NewFolder${delimiter}Name`}
                aria-label="Parameter name"
                status={check.nameError ? 'error' : undefined}
                autoFocus
              />
            </Form.Item>
          </Space.Compact>
        </Form.Item>
        <Form.Item name="description" label={optional('Description')}>
          <Input placeholder="What reads this value?" />
        </Form.Item>
        <Form.Item name="type" label="Type" required>
          <Segmented options={typeOptions} />
        </Form.Item>
        {type === 'SecureString' && (
          <Form.Item name="kmsKey" label="KMS key" required>
            <KmsKeySelect />
          </Form.Item>
        )}
        <Form.Item name="value" label="Value" required>
          <Input.TextArea
            className={styles.mono}
            autoSize={{ minRows: 4, maxRows: 12 }}
            showCount
            maxLength={MAX_VALUE_LENGTH}
          />
        </Form.Item>
        <Flex align="center" gap={8}>
          <Typography.Text type="secondary" className={styles.hint}>
            {submitShortcutLabel} to create
          </Typography.Text>
          <Button onClick={uiActions.closePane}>Cancel</Button>
          <Button
            type="primary"
            htmlType="submit"
            disabled={!check.ready}
            loading={submitting}
          >
            Create parameter
          </Button>
        </Flex>
      </Form>
    </>
  );
};

export default ParameterForm;
