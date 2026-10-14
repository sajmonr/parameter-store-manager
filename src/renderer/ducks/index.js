import { combineReducers } from 'redux';
import parametersReducer from './parameters';
import settingsReducer from './settings';
import uiReducer from './ui';

export default combineReducers({
  parameters: parametersReducer,
  settings: settingsReducer,
  ui: uiReducer
});
