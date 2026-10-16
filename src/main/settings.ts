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

export const getSetting = <K extends SettingKey>(key: K): Settings[K] =>
  store.get(key);

export const getAllSettings = (): Settings =>
  Object.fromEntries(
    settingKeys.map(key => [key, store.get(key)])
  ) as unknown as Settings;

// The settings.set endpoint validates the values.
export const setSettings = (values: Partial<Settings>): Settings => {
  const updates = Object.fromEntries(
    Object.entries(values).filter(([, value]) => value !== undefined)
  ) as Partial<Settings>;
  // set(object) writes only the given keys.
  store.set(updates as Settings);
  return getAllSettings();
};

export const onSettingsChange = (callback: (settings: Settings) => void) =>
  store.onDidAnyChange(() => callback(getAllSettings()));
