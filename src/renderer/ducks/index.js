import { combineReducers } from 'redux';
import parametersReducer from './parameters';

export default combineReducers({
  parameters: parametersReducer
});
