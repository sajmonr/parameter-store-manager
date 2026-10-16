// Setting keys shared by the main process (which stores them) and the renderer.
const availableSettings = {
  pathDelimiter: 'pathDelimiter',
  ssmRegion: 'ssmRegion',
  kmsRegion: 'kmsRegion',
  profile: 'profile',
  theme: 'theme'
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
}

export type SettingKey = keyof Settings;

export const DEFAULT_SETTINGS: Settings = {
  pathDelimiter: '/',
  ssmRegion: 'eu-west-1',
  kmsRegion: 'eu-west-1',
  profile: '',
  theme: 'system'
};
