// Renderer-side copy of the settings stored by the main process. Settings are
// loaded once before the app renders, so components can read them synchronously.
import { create } from 'zustand';
import availableSettings, {
  DEFAULT_SETTINGS
} from '../../shared/availableSettings';
import type { Settings } from '../../shared/availableSettings';
import * as api from '../clients/api';

export { availableSettings };

export const useSettingsStore = create<Settings>()(() => DEFAULT_SETTINGS);

const replace = (settings: Settings) =>
  useSettingsStore.setState(settings, true);

export const loadSettings = async () => {
  replace(await api.getAllSettings());
  api.onSettingsChange(replace);
};

export const saveSettings = async (values: Partial<Settings>) =>
  replace(await api.setSettings(values));

export const getSettings = () => useSettingsStore.getState();

const delimiterOf = (settings: Settings) => settings.pathDelimiter || '/';

export const getPathDelimiter = () => delimiterOf(getSettings());

export const usePathDelimiter = () => useSettingsStore(delimiterOf);
