import { createStore, applyMiddleware, compose } from 'redux';
import thunk from 'redux-thunk';
import { createLogger } from 'redux-logger';
import rootReducer from '../ducks';
import { actions as parameterActions } from '../ducks/parameters';

const configureStore = initialState => {
  const middleware = [thunk];
  let composeEnhancers = compose;

  if (import.meta.env.DEV) {
    middleware.push(createLogger({ level: 'info', collapsed: true }));

    // If Redux DevTools Extension is installed use it, otherwise use Redux compose

    if (window.__REDUX_DEVTOOLS_EXTENSION_COMPOSE__) {
      composeEnhancers = window.__REDUX_DEVTOOLS_EXTENSION_COMPOSE__({
        actionCreators: parameterActions
      });
    }
  }

  const store = createStore(
    rootReducer,
    initialState,
    composeEnhancers(applyMiddleware(...middleware))
  );

  if (import.meta.hot) {
    import.meta.hot.accept('../ducks', newModule => {
      if (newModule) store.replaceReducer(newModule.default);
    });
  }

  return store;
};

export default configureStore;
