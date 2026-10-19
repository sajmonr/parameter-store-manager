import { DEFAULT_STRUCTURE } from './structure';
import type { ParameterView, Structure } from './structure';

// Setting keys shared by the main process (which stores them) and the renderer.
const availableSettings = {
  pathDelimiter: 'pathDelimiter',
  ssmRegion: 'ssmRegion',
  kmsRegion: 'kmsRegion',
  profile: 'profile',
  theme: 'theme',
  structure: 'structure',
  defaultView: 'defaultView'
} as const;

export default availableSettings;

// Passed to Electron's nativeTheme.themeSource.
export const THEMES = ['system', 'light', 'dark'] as const;
export type Theme = (typeof THEMES)[number];

export interface Settings {
  pathDelimiter: string;
  ssmRegion: string;
  kmsRegion: string;
  profile: string;
  theme: Theme;
  // How paths name a service and an environment (see ./structure).
  structure: Structure;
  // The view the parameter list opens in while the structure is enabled.
  defaultView: ParameterView;
}

export type SettingKey = keyof Settings;

export const DEFAULT_SETTINGS: Settings = {
  pathDelimiter: '/',
  ssmRegion: 'eu-west-1',
  kmsRegion: 'eu-west-1',
  profile: '',
  theme: 'system',
  structure: DEFAULT_STRUCTURE,
  defaultView: 'services'
};
