import Store from 'electron-store';
import availableSettings from '../shared/availableSettings';

export { availableSettings };

const schema = {
  [availableSettings.pathDelimiter]: {
    type: 'string',
    default: '/'
  },
  [availableSettings.ssmRegion]: {
    type: 'string',
    default: 'eu-west-1'
  },
  [availableSettings.kmsRegion]: {
    type: 'string',
    default: 'eu-west-1'
  },
  [availableSettings.profile]: {
    type: 'string',
    default: ''
  }
};

const store = new Store({ schema });

export const getSetting = key => store.get(key);

export const getAllSettings = () =>
  Object.fromEntries(
    Object.values(availableSettings).map(key => [key, store.get(key)])
  );

// Only known keys with string values are accepted; the schema validates the rest.
export const setSettings = values => {
  if (!values || typeof values !== 'object') {
    throw new TypeError('Settings must be an object.');
  }
  const known = Object.values(availableSettings);
  const updates = {};
  Object.entries(values).forEach(([key, value]) => {
    if (!known.includes(key)) {
      throw new TypeError(`Unknown setting: ${key}`);
    }
    if (typeof value !== 'string') {
      throw new TypeError(`Setting ${key} must be a string.`);
    }
    updates[key] = value;
  });
  store.set(updates);
  return getAllSettings();
};

export const onSettingsChange = callback =>
  store.onDidAnyChange(() => callback(getAllSettings()));
