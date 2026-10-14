// Renderer-side view of the settings stored by the main process. Settings are
// loaded once before the app renders, so components can read them synchronously.
import availableSettings from '../shared/availableSettings';
import * as api from './clients/api';

let current = {};
const listeners = new Set();

const update = settings => {
  current = settings;
  listeners.forEach(listener => listener(current));
};

export const loadSettings = async () => {
  current = await api.getAllSettings();
  api.onSettingsChange(update);
};

export const getAllSettings = () => current;

export const saveSettings = async values =>
  update(await api.setSettings(values));

// Calls `callback(settings)` whenever the settings change; returns an unsubscribe function.
export const onSettingsChange = callback => {
  listeners.add(callback);
  return () => listeners.delete(callback);
};

export { availableSettings };
