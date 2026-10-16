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
export type Theme = 'system' | 'light' | 'dark';

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
