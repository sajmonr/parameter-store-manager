import Store from 'electron-store';
import type { Schema } from 'electron-store';
import availableSettings from '../shared/availableSettings';
import { DEFAULT_SETTINGS } from '../shared/availableSettings';
import type { SettingKey, Settings } from '../shared/availableSettings';

export { availableSettings };

const schema: Schema<Settings> = {
  [availableSettings.pathDelimiter]: {
    type: 'string',
    default: DEFAULT_SETTINGS.pathDelimiter
  },
  [availableSettings.ssmRegion]: {
    type: 'string',
    default: DEFAULT_SETTINGS.ssmRegion
  },
  [availableSettings.kmsRegion]: {
    type: 'string',
    default: DEFAULT_SETTINGS.kmsRegion
  },
  [availableSettings.profile]: {
    type: 'string',
    default: DEFAULT_SETTINGS.profile
  },
  // Passed to Electron's nativeTheme.themeSource.
  [availableSettings.theme]: {
    type: 'string',
    enum: ['system', 'light', 'dark'],
    default: DEFAULT_SETTINGS.theme
  }
};

const store = new Store<Settings>({ schema });

const settingKeys: SettingKey[] = Object.values(availableSettings);

const isSettingKey = (key: string): key is SettingKey =>
  (settingKeys as string[]).includes(key);

export const getSetting = <K extends SettingKey>(key: K): Settings[K] =>
  store.get(key);

export const getAllSettings = (): Settings =>
  Object.fromEntries(
    settingKeys.map(key => [key, store.get(key)])
  ) as unknown as Settings;

// Only known keys with string values are accepted; the schema validates the rest.
export const setSettings = (values: unknown): Settings => {
  if (!values || typeof values !== 'object') {
    throw new TypeError('Settings must be an object.');
  }
  const updates: Partial<Record<SettingKey, string>> = {};
  Object.entries(values).forEach(([key, value]) => {
    if (!isSettingKey(key)) {
      throw new TypeError(`Unknown setting: ${key}`);
    }
    if (typeof value !== 'string') {
      throw new TypeError(`Setting ${key} must be a string.`);
    }
    updates[key] = value;
  });
  // set(object) writes only the given keys; the schema rejects a theme
  // outside the enum.
  store.set(updates as Settings);
  return getAllSettings();
};

export const onSettingsChange = (callback: (settings: Settings) => void) =>
  store.onDidAnyChange(() => callback(getAllSettings()));
