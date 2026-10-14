// A copy of the settings from ../settings.js, so selectors and components can
// read them from the store. main.jsx keeps it in sync.
const SETTINGS_CHANGED = 'SETTINGS_CHANGED';

const settingsChanged = settings => ({
  type: SETTINGS_CHANGED,
  payload: settings
});

export const actions = { settingsChanged };

export default function settingsReducer(state = {}, action) {
  switch (action.type) {
    case SETTINGS_CHANGED:
      return { ...action.payload };
    default:
      return state;
  }
}

const getAllSettings = state => state.settings;
const getPathDelimiter = state => state.settings.pathDelimiter || '/';
const getProfile = state => state.settings.profile || '';
const getSsmRegion = state => state.settings.ssmRegion || '';

export const selectors = {
  getAllSettings,
  getPathDelimiter,
  getProfile,
  getSsmRegion
};
