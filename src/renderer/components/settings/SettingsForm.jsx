import React, { useEffect, useState } from 'react';
import PropTypes from 'prop-types';
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
import { useDispatch, useSelector } from 'react-redux';
import * as api from '../../clients/api';
import { actions as parameterActions } from '../../ducks/parameters';
import { selectors as settingsSelectors } from '../../ducks/settings';
import { actions as uiActions } from '../../ducks/ui';
import { availableSettings, saveSettings } from '../../settings';
import { AWS_REGIONS } from '../../utils/awsRegions';
import styles from './SettingsForm.module.css';

const { pathDelimiter, ssmRegion, kmsRegion, profile, theme } =
  availableSettings;
// Form-only field; it isn't saved, it decides what kmsRegion is saved as.
const KMS_SAME_AS_SSM = 'kmsSameAsSsm';

const themeOptions = [
  { value: 'system', label: 'System', icon: <DesktopOutlined /> },
  { value: 'light', label: 'Light', icon: <SunOutlined /> },
  { value: 'dark', label: 'Dark', icon: <MoonOutlined /> }
];

const regionOptions = current =>
  [...new Set([...AWS_REGIONS, current].filter(Boolean))]
    .sort()
    .map(region => ({ value: region, label: region }));

// The empty profile means the SDK default (AWS_PROFILE, else "default"), so
// it stands in for a profile named "default".
const profileOptions = (profiles, current) => {
  const sourceOf = name => {
    const found = profiles.find(p => p.name === name);
    return found && found.source;
  };
  const names = profiles.map(p => p.name).filter(name => name !== 'default');
  if (current && !names.includes(current)) names.unshift(current);
  return [
    { value: '', name: 'default', source: sourceOf('default') },
    ...names.map(name => ({ value: name, name, source: sourceOf(name) }))
  ].map(({ value, name, source }) => ({
    value,
    label: (
      <Flex justify="space-between" align="center" gap={8}>
        <span>{name}</span>
        {source && (
          <Typography.Text type="secondary" className={styles.suffix}>
            from ~/.aws/{source}
          </Typography.Text>
        )}
      </Flex>
    )
  }));
};

const Group = ({ title, children }) => (
  <section className={styles.group}>
    <Typography.Text type="secondary" className={styles.groupTitle}>
      {title}
    </Typography.Text>
    {children}
  </section>
);

Group.propTypes = {
  children: PropTypes.node.isRequired,
  title: PropTypes.string.isRequired
};

const SettingsForm = ({ onClose }) => {
  const dispatch = useDispatch();
  const { notification } = App.useApp();
  const [form] = Form.useForm();
  const saved = useSelector(settingsSelectors.getAllSettings);
  const [profiles, setProfiles] = useState([]);
  const [saving, setSaving] = useState(false);
  const [initialValues] = useState(() => ({
    ...saved,
    [KMS_SAME_AS_SSM]: saved[kmsRegion] === saved[ssmRegion]
  }));
  const kmsSame =
    Form.useWatch(KMS_SAME_AS_SSM, form) ?? initialValues[KMS_SAME_AS_SSM];

  useEffect(() => {
    api
      .listProfiles()
      .then(setProfiles)
      .catch(error => console.warn('Could not list AWS profiles:', error));
  }, []);

  // While "same as SSM" is on, the KMS region mirrors the SSM region.
  const onValuesChange = (_changed, values) => {
    if (values[KMS_SAME_AS_SSM] && values[kmsRegion] !== values[ssmRegion]) {
      form.setFieldValue(kmsRegion, values[ssmRegion]);
    }
  };

  // Reloads whatever the changed settings affect.
  const applyChanges = next => {
    if (
      next[profile] !== saved[profile] ||
      next[ssmRegion] !== saved[ssmRegion]
    ) {
      dispatch(uiActions.closePane());
      dispatch(uiActions.setScope(''));
      dispatch(parameterActions.fetchAllParameters({ reset: true }));
    } else if (next[pathDelimiter] !== saved[pathDelimiter]) {
      dispatch(uiActions.closePane());
      dispatch(uiActions.setScope(''));
      dispatch(uiActions.setExpandedFolders([]));
    }
    if (
      next[profile] !== saved[profile] ||
      next[kmsRegion] !== saved[kmsRegion]
    ) {
      dispatch(parameterActions.fetchKmsKeys());
    }
  };

  const onFinish = values => {
    const next = {
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
        notification.success({ message: 'Settings saved' });
        onClose();
      })
      .catch(error => {
        setSaving(false);
        notification.error({
          message: 'Settings were not saved',
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

SettingsForm.propTypes = {
  onClose: PropTypes.func.isRequired
};

export default SettingsForm;
