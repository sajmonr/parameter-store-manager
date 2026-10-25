import { useMemo, useState } from 'react';
import {
  Alert,
  App,
  Button,
  Flex,
  Form,
  Input,
  Segmented,
  Select,
  Tooltip,
  Typography
} from 'antd';
import {
  AppstoreOutlined,
  EditOutlined,
  FolderAddOutlined,
  LockOutlined
} from '@ant-design/icons';
import type { ReactNode } from 'react';
import { DEFAULT_KMS_KEY } from '../../../main/endpoints/parameters/putParameter/putParameter.contract';
import type { EditableParameterType } from '../../../main/endpoints/parameters/putParameter/putParameter.contract';
import { useCreateParameters } from '../../state/parameters';
import { useLocationContext } from '../../state/settings';
import { uiActions } from '../../state/ui';
import type { NewParameterPrefill } from '../../state/ui';
import { useFolderSet, useLocation, useNameSet } from '../../state/views';
import {
  environmentsOf,
  envsForService,
  initialNaming,
  isValueValid,
  MAX_VALUE_LENGTH,
  missingFolders,
  NAME_ERRORS,
  nameErrorOf,
  suggestionsFor,
  targetsOf,
  toPath,
  toStructured
} from '../../utils/newParameter';
import type { NameError, Naming } from '../../utils/newParameter';
import { parse, pathOf } from '../../utils/structure';
import { isSubmitShortcut, submitShortcutLabel } from '../../utils/keys';
import PaneHeader from '../detail/PaneHeader';
import CreatePreview, { breakable } from './CreatePreview';
import type { PreviewRow } from './CreatePreview';
import EnvironmentPicker from './EnvironmentPicker';
import KmsKeySelect from './KmsKeySelect';
import NameField from './NameField';
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
  description: string;
  type: EditableParameterType;
  kmsKey: string;
  value: string;
}

// After a create of several parameters that partly failed.
interface Outcome {
  created: ReadonlySet<string>;
  failed: ReadonlyMap<string, string>;
}

const optional = (label: ReactNode) => (
  <>
    {label}&nbsp;<Typography.Text type="secondary">(optional)</Typography.Text>
  </>
);

const nameErrorText = (error: NameError, delimiter: string) =>
  ({
    [NAME_ERRORS.spaces]: "Names can't contain spaces.",
    [NAME_ERRORS.characters]: `Use letters, digits, _ . - and ${delimiter} only.`,
    [NAME_ERRORS.leadingDelimiter]: `The key starts after the service. Remove the leading ${delimiter}.`,
    [NAME_ERRORS.notRooted]: `Paths start with ${delimiter}.`,
    [NAME_ERRORS.emptySegment]: `Folder names can't be empty. Remove the extra ${delimiter}.`,
    [NAME_ERRORS.noName]: `Add a name after the last ${delimiter}.`
  })[error];

const listEnvs = (envs: string[]) =>
  `${envs.join(', ')}. Deselect ${envs.length > 1 ? 'them' : 'it'}`;

// Creates a parameter, or the same key in several environments of a service.
// `prefill` comes from Duplicate; without it the form starts at the location.
const ParameterForm = ({
  prefill
}: {
  prefill: NewParameterPrefill | null;
}) => {
  const { notification } = App.useApp();
  const [form] = Form.useForm<FormValues>();
  const context = useLocationContext();
  const { structure, delimiter } = context;
  const location = useLocation();
  const existingNames = useNameSet();
  const folders = useFolderSet();
  const createParameters = useCreateParameters();
  const submitting = createParameters.isPending;

  const [naming, setNamingState] = useState<Naming>(() =>
    initialNaming(location, context, prefill?.source ?? null)
  );
  // Whether the user has left the key or path field since it was shown.
  const [left, setLeft] = useState(false);
  const [outcome, setOutcome] = useState<Outcome | null>(null);

  // What was created or failed no longer applies to another name.
  const setNaming = (next: Naming) => {
    setNamingState(next);
    setOutcome(null);
  };

  const [initialValues] = useState<FormValues>(() => ({
    description: prefill?.description ?? '',
    type: prefill?.type ?? 'String',
    value: prefill?.value ?? '',
    kmsKey: prefill?.kmsKey || DEFAULT_KMS_KEY
  }));

  // useWatch is undefined until the form mounts.
  const value = Form.useWatch('value', form) ?? initialValues.value;
  const type = Form.useWatch('type', form) ?? initialValues.type;

  const structured = naming.mode === 'structured';
  const text = structured ? naming.key : naming.path;
  const setText = (next: string) =>
    setNaming(
      structured ? { ...naming, key: next } : { ...naming, path: next }
    );

  const services = structure.services.filter(s => s.environments.length);
  const canSwitch = structure.enabled && services.length > 0;
  const environments = environmentsOf(naming.service, structure);
  const noEnvs = structured && !naming.envs.length;
  const allEnvs = naming.envs.length === environments.length;

  const nameError = nameErrorOf(text, naming.mode, delimiter);
  // A trailing delimiter is where the user is mid-way through folders, or
  // where the form starts.
  const shownError =
    nameError === NAME_ERRORS.noName && !left ? null : nameError;
  const named = !!text && !nameError;

  const targets = named ? targetsOf(naming, context) : [];
  const created = outcome?.created ?? new Set<string>();
  const existing = targets.filter(
    name => existingNames.has(name) && !created.has(name)
  );
  const pending = targets.filter(name => !created.has(name));

  const suggestions = useMemo(
    () => suggestionsFor(text, naming, folders, context),
    [text, naming, folders, context]
  );
  const newFolders = nameError
    ? ''
    : missingFolders(text, naming, folders, context);

  const ready =
    targets.length > 0 &&
    !existing.length &&
    !!pending.length &&
    isValueValid(value);

  let fieldHelp: ReactNode = shownError && nameErrorText(shownError, delimiter);
  if (!fieldHelp && existing.length) {
    fieldHelp =
      targets.length === 1
        ? 'This name already exists. Open it to edit instead.'
        : `Already exists in ${listEnvs(
            existing.map(name => parse(name, structure, delimiter)!.env)
          )} or change the key.`;
  }

  const rows: PreviewRow[] = targets.map(name => {
    const match = parse(name, structure, delimiter);
    const color = match
      ? (structure.environments.find(e => e.segment === match.env)?.color ??
        null)
      : null;
    let meta: string | null = null;
    if (!structured && structure.enabled) {
      meta = match ? `${match.service} · ${match.env}` : 'Other paths';
    }
    return {
      name,
      color,
      meta,
      exists: existingNames.has(name),
      created: created.has(name),
      error: outcome?.failed.get(name)
    };
  });

  const finish = (all: string[]) => {
    const [first] = targets.filter(name => all.includes(name));
    if (targets.length > 1) {
      notification.success({
        title: `Created in ${targets.length} environments`,
        description: naming.key
      });
    } else {
      notification.success({ title: 'Parameter created', description: first });
    }
    uiActions.showCreatedParameter(first!);
  };

  const submit = () => {
    if (!ready || submitting) return;
    const values = form.getFieldsValue();
    createParameters
      .mutateAsync(
        pending.map(name => ({
          name,
          description: values.description,
          type: values.type,
          kmsKey: values.kmsKey,
          value: values.value,
          overwrite: false
        }))
      )
      .then(result => {
        const all = [...created, ...result.created];
        if (!result.failed.size) {
          finish(all);
        } else if (targets.length === 1) {
          notification.error({
            title: 'Parameter was not created',
            description: [...result.failed.values()][0]
          });
        } else {
          setOutcome({ created: new Set(all), failed: result.failed });
        }
      });
  };

  const switchLink = canSwitch && (
    <Typography.Link
      className={styles.switch}
      onClick={() => {
        setLeft(false);
        setNaming(
          structured ? toPath(naming, context) : toStructured(naming, context)
        );
      }}
    >
      {structured ? (
        <>
          <EditOutlined /> Use a custom path
        </>
      ) : (
        <>
          <AppstoreOutlined /> Use service and environment
        </>
      )}
    </Typography.Link>
  );

  const prefixEnv =
    naming.envs.length === 1 ? naming.envs[0]! : '{environment}';
  const keyLabel = (
    <span className={styles.labelRow}>
      Key
      <span className={styles.prefix}>
        <span className={styles.prefixText}>
          under {pathOf(prefixEnv, naming.service, '', structure, delimiter)}
        </span>
      </span>
    </span>
  );

  const environmentsLabel = (
    <span className={styles.labelRow}>
      Environments
      {environments.length > 1 && (
        <Typography.Link
          className={styles.labelAction}
          onClick={() =>
            setNaming({
              ...naming,
              envs: allEnvs ? [] : environments.map(e => e.segment)
            })
          }
        >
          {allEnvs ? 'Clear' : 'Select all'}
        </Typography.Link>
      )}
    </span>
  );

  const failedCount = outcome?.failed.size ?? 0;

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
        {structured && (
          <>
            <Form.Item label="Service" required>
              <Select
                className={styles.mono}
                value={naming.service}
                onChange={service =>
                  setNaming({
                    ...naming,
                    service,
                    envs: envsForService(service, naming.envs, structure)
                  })
                }
                options={services.map(s => ({
                  value: s.segment,
                  label: s.segment
                }))}
                prefix={<AppstoreOutlined />}
                aria-label="Service"
              />
            </Form.Item>
            <Form.Item
              label={environmentsLabel}
              required
              className={styles.wideLabel}
              validateStatus={noEnvs ? 'error' : undefined}
              help={noEnvs ? 'Pick at least one environment.' : undefined}
            >
              <EnvironmentPicker
                environments={environments}
                value={naming.envs}
                onChange={envs => setNaming({ ...naming, envs })}
              />
            </Form.Item>
          </>
        )}
        <Form.Item
          label={structured ? keyLabel : 'Path'}
          required
          className={styles.wideLabel}
          validateStatus={fieldHelp ? 'error' : undefined}
          help={fieldHelp || undefined}
          extra={
            (newFolders || switchLink) && (
              <Flex vertical gap={4} className={styles.extra}>
                {newFolders && (
                  <Typography.Text type="secondary">
                    <FolderAddOutlined /> Creates new folder{' '}
                    <code className={styles.code}>
                      {breakable(newFolders, delimiter)}
                    </code>
                  </Typography.Text>
                )}
                {switchLink}
              </Flex>
            )
          }
        >
          <NameField
            key={naming.mode}
            value={text}
            onChange={setText}
            suggestions={suggestions}
            error={!!fieldHelp}
            onFocusChange={focused => setLeft(!focused)}
            placeholder={
              structured
                ? undefined
                : `${delimiter}development${delimiter}compass${delimiter}AppServer${delimiter}Workers${delimiter}MaxConcurrency`
            }
            aria-label={structured ? 'Key' : 'Path'}
          />
        </Form.Item>
        {rows.length > 0 && <CreatePreview rows={rows} delimiter={delimiter} />}
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
        <Form.Item
          name="value"
          label="Value"
          required
          extra={
            targets.length > 1 ? (
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
          />
        </Form.Item>
        {failedCount > 0 && (
          <Alert
            type="error"
            showIcon
            className={styles.alert}
            title={`Created ${targets.length - failedCount} of ${targets.length}. ${failedCount} failed.`}
          />
        )}
        <Flex align="center" gap={8}>
          <Typography.Text type="secondary" className={styles.hint}>
            {submitShortcutLabel} to create
          </Typography.Text>
          <Button onClick={uiActions.closePane}>Cancel</Button>
          <Button
            type="primary"
            htmlType="submit"
            disabled={!ready}
            loading={submitting}
          >
            {failedCount > 0 && 'Retry failed'}
            {!failedCount &&
              (targets.length > 1
                ? `Create in ${targets.length} environments`
                : 'Create parameter')}
          </Button>
        </Flex>
      </Form>
    </>
  );
};

export default ParameterForm;
