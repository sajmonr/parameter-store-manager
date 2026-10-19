import { Card, Form, Segmented } from 'antd';
import { DesktopOutlined, MoonOutlined, SunOutlined } from '@ant-design/icons';
import type { Theme } from '../../../shared/availableSettings';
import { delimiterConflict } from '../../../shared/structure';
import type { ParameterView, Structure } from '../../../shared/structure';
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

const viewOptions = [
  { value: 'services', label: 'Services' },
  { value: 'environments', label: 'Environments' },
  { value: 'paths', label: 'Paths' }
];

// Configured segments can't contain the delimiter, or paths would split
// inside them.
const delimiterError = (delimiter: string, structure: Structure) => {
  if (!delimiter) return 'Enter a delimiter.';
  if (/\s/.test(delimiter)) return "The delimiter can't contain spaces.";
  const segment = delimiterConflict(structure, delimiter);
  if (segment) {
    return segment.includes(delimiter)
      ? `"${segment}" contains "${delimiter}".`
      : `"${segment}" ends with part of "${delimiter}".`;
  }
  return null;
};

const DisplaySection = () => {
  const pathDelimiter = useSettingsStore(settings => settings.pathDelimiter);
  const theme = useSettingsStore(settings => settings.theme);
  const structure = useSettingsStore(settings => settings.structure);
  const defaultView = useSettingsStore(settings => settings.defaultView);
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
          validate={value => delimiterError(value, structure)}
          onSave={value => saveSettingsAndApply({ pathDelimiter: value })}
          maxLength={3}
          className={styles.delimiter}
        />
        {/* The other views read paths with the structure. */}
        {structure.enabled && (
          <Form.Item label="Default view">
            <Segmented
              options={viewOptions}
              value={defaultView}
              onChange={value => save({ defaultView: value as ParameterView })}
            />
          </Form.Item>
        )}
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
