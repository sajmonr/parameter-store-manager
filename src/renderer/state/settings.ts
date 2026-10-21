// Renderer-side copy of the settings stored by the main process. Settings are
// loaded once before the app renders, so components can read them synchronously.
import { useMemo } from 'react';
import { create } from 'zustand';
import availableSettings, {
  DEFAULT_SETTINGS
} from '../../shared/availableSettings';
import type { Settings } from '../../shared/availableSettings';
import { settingsService } from '../services';
import type { LocationContext } from '../utils/location';

export { availableSettings };

export const useSettingsStore = create<Settings>()(() => DEFAULT_SETTINGS);

const replace = (settings: Settings) =>
  useSettingsStore.setState(settings, true);

export const loadSettings = async () => {
  replace(await settingsService.getAll());
  settingsService.onChange(replace);
};

export const saveSettings = async (values: Partial<Settings>) =>
  replace(await settingsService.set(values));

export const getSettings = () => useSettingsStore.getState();

const delimiterOf = (settings: Settings) => settings.pathDelimiter || '/';

export const getPathDelimiter = () => delimiterOf(getSettings());

export const usePathDelimiter = () => useSettingsStore(delimiterOf);

// What the location helpers read paths with.
export const getLocationContext = (): LocationContext => {
  const settings = getSettings();
  return { structure: settings.structure, delimiter: delimiterOf(settings) };
};

export const useLocationContext = () => {
  const structure = useSettingsStore(settings => settings.structure);
  const delimiter = usePathDelimiter();
  return useMemo(() => ({ structure, delimiter }), [structure, delimiter]);
};
