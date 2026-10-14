// A real store for duck and component tests.
import { applyMiddleware, createStore } from 'redux';
import { thunk } from 'redux-thunk';
import rootReducer from '../ducks';
import { actions as settingsActions } from '../ducks/settings';

export const PARAMETER_LIST_LOADED = 'FETCH_ALL_PARAMETERS_SUCCESS';

export const makeParameter = (Name, extra = {}) => ({
  Name,
  Type: 'String',
  Value: `value of ${Name}`,
  Version: 1,
  LastModifiedDate: new Date('2026-01-01T00:00:00Z'),
  ...extra
});

// Builds a store with the given parameters loaded, as after a successful fetch.
export const createTestStore = ({ parameters = [], settings = {} } = {}) => {
  const store = createStore(rootReducer, applyMiddleware(thunk));
  store.dispatch(
    settingsActions.settingsChanged({
      pathDelimiter: '/',
      profile: '',
      ssmRegion: 'us-east-1',
      kmsRegion: 'us-east-1',
      theme: 'system',
      ...settings
    })
  );
  if (parameters.length) {
    store.dispatch({ type: 'FETCH_ALL_PARAMETERS_REQUEST', payload: {} });
    store.dispatch({
      type: 'FETCH_ALL_PARAMETERS_BATCH_LOADED',
      payload: parameters
    });
    store.dispatch({
      type: 'FETCH_PARAMETER_VALUES_SUCCESS',
      payload: {
        nameValueMapping: Object.fromEntries(parameters.map(p => [p.Name, p]))
      }
    });
    store.dispatch({ type: PARAMETER_LIST_LOADED, payload: parameters });
  }
  return store;
};
