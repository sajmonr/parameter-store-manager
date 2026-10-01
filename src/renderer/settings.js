// Renderer-side view of the settings stored by the main process. Settings are
// loaded once before the app renders, so components can read them synchronously.
import availableSettings from '../shared/availableSettings';
import * as api from './clients/api';

let current = {};
const listeners = new Set();

const update = settings => {
  const previous = current;
  current = settings;
  listeners.forEach(listener => listener(current, previous));
};

export const loadSettings = async () => {
  current = await api.getAllSettings();
  api.onSettingsChange(update);
};

export const getSetting = key => current[key];

export const saveSettings = async values =>
  update(await api.setSettings(values));

// Calls `callback(newValue, oldValue)` whenever `key` changes; returns an unsubscribe function.
export const onSettingChange = (key, callback) => {
  const listener = (next, previous) => {
    if (next[key] !== previous[key]) callback(next[key], previous[key]);
  };
  listeners.add(listener);
  return () => listeners.delete(listener);
};

export { availableSettings };
