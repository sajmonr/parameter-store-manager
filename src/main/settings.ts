import Store from 'electron-store';
import type { Schema } from 'electron-store';
import availableSettings from '../shared/availableSettings';
import { DEFAULT_SETTINGS, THEMES } from '../shared/availableSettings';
import type { SettingKey, Settings } from '../shared/availableSettings';
import {
  ENVIRONMENT_COLORS,
  LAYOUTS,
  PARAMETER_VIEWS,
  structureErrors
} from '../shared/structure';

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
    enum: [...THEMES],
    default: DEFAULT_SETTINGS.theme
  },
  // The shape only; the settings.set endpoint checks the segments.
  [availableSettings.structure]: {
    type: 'object',
    properties: {
      enabled: { type: 'boolean' },
      layout: { type: 'string', enum: [...LAYOUTS] },
      environments: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            segment: { type: 'string' },
            color: { type: 'string', enum: [...ENVIRONMENT_COLORS] }
          },
          required: ['segment', 'color']
        }
      },
      services: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            segment: { type: 'string' },
            environments: { type: 'array', items: { type: 'string' } }
          },
          required: ['segment', 'environments']
        }
      }
    },
    required: ['enabled', 'layout', 'environments', 'services'],
    default: DEFAULT_SETTINGS.structure
  },
  [availableSettings.defaultView]: {
    type: 'string',
    enum: [...PARAMETER_VIEWS],
    default: DEFAULT_SETTINGS.defaultView
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

// The settings.set endpoint validates the values on their own. Segments also
// can't contain the path delimiter, which may be saved separately, so that is
// checked against the settings they would be saved with.
export const setSettings = (values: Partial<Settings>): Settings => {
  const updates = Object.fromEntries(
    Object.entries(values).filter(([, value]) => value !== undefined)
  ) as Partial<Settings>;
  if (updates.structure || updates.pathDelimiter !== undefined) {
    const next = { ...getAllSettings(), ...updates };
    const [error] = structureErrors(next.structure, next.pathDelimiter || '/');
    if (error) throw new Error(error);
  }
  // set(object) writes only the given keys.
  store.set(updates as Settings);
  return getAllSettings();
};

export const onSettingsChange = (callback: (settings: Settings) => void) =>
  store.onDidAnyChange(() => callback(getAllSettings()));
