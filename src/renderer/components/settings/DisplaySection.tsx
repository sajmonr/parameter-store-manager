import { Card, Form, Segmented } from 'antd';
import { DesktopOutlined, MoonOutlined, SunOutlined } from '@ant-design/icons';
import type { Theme } from '../../../shared/availableSettings';
import { useSettingsStore } from '../../state/settings';
import { saveSettingsAndApply } from '../../state/settingsChanges';
import SettingInput from './SettingInput';
import useSaveSettings from './useSaveSettings';
import styles from './Settings.module.css';

const themeOptions = [
  { value: 'system', label: 'System', icon: <DesktopOutlined /> },
  { value: 'light', label: 'Light', icon: <SunOutlined /> },
  { value: 'dark', label: 'Dark', icon: <MoonOutlined /> }
];

const delimiterError = (delimiter: string) => {
  if (!delimiter) return 'Enter a delimiter.';
  if (/\s/.test(delimiter)) return "The delimiter can't contain spaces.";
  return null;
};

// TODO(#34): add the default view.
const DisplaySection = () => {
  const pathDelimiter = useSettingsStore(settings => settings.pathDelimiter);
  const theme = useSettingsStore(settings => settings.theme);
  const save = useSaveSettings();

  return (
    <Card>
      <Form layout="vertical" className={styles.form}>
        {/* Saved only when committed: a new delimiter resets the folder and
            the expanded folders. */}
        <SettingInput
          id="settings-path-delimiter"
          label="Path delimiter"
          tooltip="The separator between folders in parameter names. Usually /."
          value={pathDelimiter}
          validate={delimiterError}
          onSave={value => saveSettingsAndApply({ pathDelimiter: value })}
          maxLength={3}
          className={styles.delimiter}
        />
        <Form.Item label="Theme">
          <Segmented
            options={themeOptions}
            value={theme}
            onChange={value => save({ theme: value as Theme })}
          />
        </Form.Item>
      </Form>
    </Card>
  );
};

export default DisplaySection;
