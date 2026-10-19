import Store from 'electron-store';
import type { Schema } from 'electron-store';
import availableSettings from '../shared/availableSettings';
import { DEFAULT_SETTINGS, THEMES } from '../shared/availableSettings';
import type { SettingKey, Settings } from '../shared/availableSettings';
import {
  DEFAULT_ENVIRONMENT_COLOR,
  isHexColor,
  LAYOUTS,
  PARAMETER_VIEWS,
  structureErrors
} from '../shared/structure';
import type { Structure } from '../shared/structure';

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
            // Any string, so a file with another colour still loads; see
            // withHexColors.
            color: { type: 'string' }
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

// A colour that isn't '#rrggbb' reads as the default one.
const withHexColors = (structure: Structure): Structure => ({
  ...structure,
  environments: structure.environments.map(e =>
    isHexColor(e.color) ? e : { ...e, color: DEFAULT_ENVIRONMENT_COLOR }
  )
});

export const getSetting = <K extends SettingKey>(key: K): Settings[K] => {
  const value = store.get(key);
  return key === availableSettings.structure
    ? (withHexColors(value as Structure) as Settings[K])
    : value;
};

export const getAllSettings = (): Settings =>
  Object.fromEntries(
    settingKeys.map(key => [key, getSetting(key)])
  ) as unknown as Settings;

// The settings.set endpoint validates the values on their own. Segments also
// can't contain the path delimiter, which may be saved separately, so that is
// checked against the settings they would be saved with. The form always sends
// the delimiter, so it is only checked when it changes: an old file may hold
// one the default structure already clashes with.
export const setSettings = (values: Partial<Settings>): Settings => {
  const updates = Object.fromEntries(
    Object.entries(values).filter(([, value]) => value !== undefined)
  ) as Partial<Settings>;
  const delimiterChanged =
    updates.pathDelimiter !== undefined &&
    updates.pathDelimiter !== getSetting(availableSettings.pathDelimiter);
  if (updates.structure || delimiterChanged) {
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
