import type { Settings } from '../../shared/availableSettings';
import { getSettingsContract } from '../../main/endpoints/settings/getSettings/getSettings.contract';
import { setSettingsContract } from '../../main/endpoints/settings/setSettings/setSettings.contract';
import { call } from '../clients/call';

export const settingsService = {
  getAll: () => call(getSettingsContract),

  // Resolves to all settings after the change.
  set: (values: Partial<Settings>) => call(setSettingsContract, values),

  // Settings changed by the main process; returns an unsubscribe function.
  onChange: (callback: (settings: Settings) => void) =>
    window.api.on('settings.changed', callback)
};
