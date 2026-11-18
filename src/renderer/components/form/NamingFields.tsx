import { Flex, Form, Select, Typography } from 'antd';
import {
  AppstoreOutlined,
  EditOutlined,
  FolderAddOutlined
} from '@ant-design/icons';
import { useLocationContext } from '../../state/settings';
import { envsForService, toPath, toStructured } from '../../utils/naming';
import { breakable } from '../../utils/paths';
import { environmentsOf, pathOf } from '../../utils/structure';
import EnvironmentPicker from './EnvironmentPicker';
import NameField from './NameField';
import type { NamingState } from './useNaming';
import styles from './ParameterForm.module.css';

// The service, environments and key in structured mode, or the full path,
// with a link to switch between the two.
const NamingFields = ({ naming: state }: { naming: NamingState }) => {
  const context = useLocationContext();
  const { structure, delimiter } = context;
  const {
    naming,
    setNaming,
    structured,
    text,
    setText,
    setLeft,
    suggestions,
    newFolders,
    fieldHelp
  } = state;

  const services = structure.services.filter(s => s.environments.length);
  const canSwitch = structure.enabled && services.length > 0;
  const environments = environmentsOf(naming.service, structure);
  const noEnvs = structured && !naming.envs.length;
  const allEnvs = naming.envs.length === environments.length;

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
    <Flex
      component="span"
      align="baseline"
      gap="var(--ant-margin-sm)"
      className={styles.labelRow}
    >
      Key
      <span className={styles.prefix}>
        <span className={styles.prefixText}>
          under {pathOf(prefixEnv, naming.service, '', structure, delimiter)}
        </span>
      </span>
    </Flex>
  );

  const environmentsLabel = (
    <Flex
      component="span"
      align="baseline"
      gap="var(--ant-margin-sm)"
      className={styles.labelRow}
    >
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
    </Flex>
  );

  return (
    <>
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
            <Flex vertical gap="var(--ant-margin-xxs)" className={styles.extra}>
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
    </>
  );
};

export default NamingFields;
