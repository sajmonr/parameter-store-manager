import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import {
  App,
  Button,
  Checkbox,
  Flex,
  Form,
  Input,
  Segmented,
  Select,
  Typography
} from 'antd';
import { DesktopOutlined, MoonOutlined, SunOutlined } from '@ant-design/icons';
import type { Settings } from '../../../shared/availableSettings';
import type { ListProfilesResponse } from '../../../main/endpoints/aws/listProfiles/listProfiles.contract';
import { profilesService } from '../../services';
import {
  availableSettings,
  saveSettings,
  useSettingsStore
} from '../../state/settings';
import { uiActions } from '../../state/ui';
import { AWS_REGIONS } from '../../utils/awsRegions';
import styles from './SettingsForm.module.css';

const { pathDelimiter, ssmRegion, kmsRegion, profile, theme } =
  availableSettings;
// Form-only field; it isn't saved, it decides what kmsRegion is saved as.
const KMS_SAME_AS_SSM = 'kmsSameAsSsm';

type SettingsFormValues = Settings & { [KMS_SAME_AS_SSM]: boolean };

const themeOptions = [
  { value: 'system', label: 'System', icon: <DesktopOutlined /> },
  { value: 'light', label: 'Light', icon: <SunOutlined /> },
  { value: 'dark', label: 'Dark', icon: <MoonOutlined /> }
];

const regionOptions = (current: string) =>
  [...new Set([...AWS_REGIONS, current].filter(Boolean))]
    .sort()
    .map(region => ({ value: region, label: region }));

// The empty profile means the SDK default: AWS_PROFILE if set, otherwise the
// profile named "default". Without AWS_PROFILE the two are the same, so the
// empty profile is shown as "default"; with it, both are listed.
const profileOptions = (
  { profiles, envProfile }: ListProfilesResponse,
  current: string
) => {
  const sourceText = (name: string) => {
    const found = profiles.find(p => p.name === name);
    return found && `from ~/.aws/${found.source}`;
  };
  const names = profiles
    .map(p => p.name)
    .filter(name => envProfile || name !== 'default');
  if (current && !names.includes(current)) names.unshift(current);
  const sdkDefault = envProfile
    ? { value: '', name: 'SDK default', suffix: `AWS_PROFILE=${envProfile}` }
    : { value: '', name: 'default', suffix: sourceText('default') };
  return [
    sdkDefault,
    ...names.map(name => ({ value: name, name, suffix: sourceText(name) }))
  ].map(({ value, name, suffix }) => ({
    value,
    label: (
      <Flex justify="space-between" align="center" gap={8}>
        <span>{name}</span>
        {suffix && (
          <Typography.Text type="secondary" className={styles.suffix}>
            {suffix}
          </Typography.Text>
        )}
      </Flex>
    )
  }));
};

const Group = ({ title, children }: { title: string; children: ReactNode }) => (
  <section className={styles.group}>
    <Typography.Text type="secondary" className={styles.groupTitle}>
      {title}
    </Typography.Text>
    {children}
  </section>
);

const SettingsForm = ({ onClose }: { onClose: () => void }) => {
  const { notification } = App.useApp();
  const [form] = Form.useForm<SettingsFormValues>();
  const saved = useSettingsStore();
  const [profiles, setProfiles] = useState<ListProfilesResponse>({
    profiles: [],
    envProfile: null
  });
  const [saving, setSaving] = useState(false);
  const [initialValues] = useState<SettingsFormValues>(() => ({
    ...saved,
    [KMS_SAME_AS_SSM]: saved[kmsRegion] === saved[ssmRegion]
  }));
  const kmsSame =
    Form.useWatch(KMS_SAME_AS_SSM, form) ?? initialValues[KMS_SAME_AS_SSM];

  useEffect(() => {
    profilesService
      .list()
      .then(setProfiles)
      .catch(error => console.warn('Could not list AWS profiles:', error));
  }, []);

  // While "same as SSM" is on, the KMS region mirrors the SSM region.
  const onValuesChange = (
    _changed: Partial<SettingsFormValues>,
    values: SettingsFormValues
  ) => {
    if (values[KMS_SAME_AS_SSM] && values[kmsRegion] !== values[ssmRegion]) {
      form.setFieldValue(kmsRegion, values[ssmRegion]);
    }
  };

  // Parameters and KMS keys are loaded per profile and region, so a change
  // there loads them again by itself. The open pane and the folder state
  // don't carry over.
  const applyChanges = (next: Settings) => {
    if (
      next[profile] !== saved[profile] ||
      next[ssmRegion] !== saved[ssmRegion]
    ) {
      uiActions.closePane();
      uiActions.setScope('');
    } else if (next[pathDelimiter] !== saved[pathDelimiter]) {
      uiActions.closePane();
      uiActions.setScope('');
      uiActions.setExpandedFolders([]);
    }
  };

  const onFinish = (values: SettingsFormValues) => {
    const next: Settings = {
      [profile]: values[profile] || '',
      [ssmRegion]: values[ssmRegion],
      [kmsRegion]: values[KMS_SAME_AS_SSM]
        ? values[ssmRegion]
        : values[kmsRegion],
      [pathDelimiter]: values[pathDelimiter],
      [theme]: values[theme]
    };
    setSaving(true);
    saveSettings(next)
      .then(() => {
        applyChanges(next);
        notification.success({ title: 'Settings saved' });
        onClose();
      })
      .catch(error => {
        setSaving(false);
        notification.error({
          title: 'Settings were not saved',
          description: error.message
        });
      });
  };

  return (
    <Form
      form={form}
      layout="vertical"
      initialValues={initialValues}
      onValuesChange={onValuesChange}
      onFinish={onFinish}
      className={styles.form}
    >
      <Group title="AWS connection">
        <Form.Item label="Profile" name={profile}>
          <Select options={profileOptions(profiles, saved[profile])} />
        </Form.Item>
        <Flex gap={12}>
          <Form.Item
            label="SSM region"
            name={ssmRegion}
            rules={[{ required: true, message: 'Pick a region.' }]}
            className={styles.half}
          >
            <Select showSearch options={regionOptions(saved[ssmRegion])} />
          </Form.Item>
          <Form.Item
            label="KMS region"
            name={kmsRegion}
            rules={[{ required: true, message: 'Pick a region.' }]}
            className={styles.half}
          >
            <Select
              showSearch
              disabled={kmsSame}
              options={regionOptions(saved[kmsRegion])}
            />
          </Form.Item>
        </Flex>
        <Form.Item name={KMS_SAME_AS_SSM} valuePropName="checked">
          <Checkbox>KMS region same as SSM</Checkbox>
        </Form.Item>
      </Group>
      <Group title="Display">
        <Form.Item
          label="Path delimiter"
          name={pathDelimiter}
          rules={[{ required: true, message: 'Enter a delimiter.' }]}
          tooltip="The separator between folders in parameter names. Usually /."
        >
          <Input className={styles.delimiter} maxLength={3} />
        </Form.Item>
        <Form.Item label="Theme" name={theme}>
          <Segmented options={themeOptions} />
        </Form.Item>
      </Group>
      <Flex justify="flex-end" gap={8}>
        <Button onClick={onClose}>Cancel</Button>
        <Button type="primary" htmlType="submit" loading={saving}>
          Save
        </Button>
      </Flex>
    </Form>
  );
};

export default SettingsForm;
