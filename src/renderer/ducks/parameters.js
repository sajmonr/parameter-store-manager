import { combineReducers } from 'redux';
import pAll from 'p-all';
import { createSelector } from 'reselect';
import * as api from '../clients/api';
import { feedback } from '../feedback';
import { classifyFetchError, describeError } from '../utils/awsErrors';

const FETCH_ALL_PARAMETERS_REQUEST = 'FETCH_ALL_PARAMETERS_REQUEST';
const FETCH_ALL_PARAMETERS_FAILURE = 'FETCH_ALL_PARAMETERS_FAILURE';
const FETCH_ALL_PARAMETERS_SUCCESS = 'FETCH_ALL_PARAMETERS_SUCCESS';
const FETCH_ALL_PARAMETERS_BATCH_LOADED = 'FETCH_ALL_PARAMETERS_BATCH_LOADED';

const FETCH_PARAMETER_VALUES_REQUEST = 'FETCH_PARAMETER_VALUES_REQUEST';
const FETCH_PARAMETER_VALUES_FAILURE = 'FETCH_PARAMETER_VALUES_FAILURE';
const FETCH_PARAMETER_VALUES_SUCCESS = 'FETCH_PARAMETER_VALUES_SUCCESS';

const FETCH_KMS_KEYS_REQUEST = 'FETCH_KMS_KEYS_REQUEST';
const FETCH_KMS_KEYS_FAILURE = 'FETCH_KMS_KEYS_FAILURE';
const FETCH_KMS_KEYS_SUCCESS = 'FETCH_KMS_KEYS_SUCCESS';

const CREATE_SERVICE_PARAMETERS_REQUEST = 'CREATE_SERVICE_PARAMETERS_REQUEST';
const CREATE_SERVICE_PARAMETERS_FAILURE = 'CREATE_SERVICE_PARAMETERS_FAILURE';
const CREATE_SERVICE_PARAMETERS_SUCCESS = 'CREATE_SERVICE_PARAMETERS_SUCCESS';

const CREATE_GENERIC_PARAMETER_REQUEST = 'CREATE_GENERIC_PARAMETER_REQUEST';
const CREATE_GENERIC_PARAMETER_FAILURE = 'CREATE_GENERIC_PARAMETER_FAILURE';
const CREATE_GENERIC_PARAMETER_SUCCESS = 'CREATE_GENERIC_PARAMETER_SUCCESS';

const DELETE_PARAMETER_REQUEST = 'DELETE_PARAMETER_REQUEST';
const DELETE_PARAMETER_FAILURE = 'DELETE_PARAMETER_FAILURE';
const DELETE_PARAMETER_SUCCESS = 'DELETE_PARAMETER_SUCCESS';

// AWS limits GetParameters to 10 names per call.
const VALUES_BATCH_SIZE = 10;

const withoutKey = (object, key) => {
  const rest = { ...object };
  delete rest[key];
  return rest;
};

const pick = (object, keys) =>
  Object.fromEntries(
    keys.filter(key => key in object).map(key => [key, object[key]])
  );

const chunk = (items, size) => {
  const chunks = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
};

// `isCurrent` reports whether the load that asked for these values is still
// the latest one; results of an outdated load are dropped.
const fetchParameterValues =
  (names, isCurrent = () => true) =>
  dispatch => {
    dispatch({ type: FETCH_PARAMETER_VALUES_REQUEST, payload: { names } });

    const getParameterRequestActions = chunk(names, VALUES_BATCH_SIZE).map(
      currBatchNames => () =>
        api
          .getParameters(currBatchNames)
          .then(({ parameters, invalidParameters }) => {
            const mapping = parameters.reduce((map, param) => {
              map[param.Name] = param;
              return map;
            }, {});

            return [mapping, invalidParameters];
          })
          .catch(err => {
            console.error(
              'Something went wrong while fetching parameters',
              err
            );
            if (!isCurrent()) return [{}, []];

            dispatch({
              type: FETCH_PARAMETER_VALUES_FAILURE,
              payload: { names: currBatchNames }
            });
            return [{}, []];
          })
    );

    return pAll(getParameterRequestActions, { concurrency: 2 }).then(
      bulkResults => {
        if (!isCurrent()) return [{}, []];
        // bulkResults is a list of [mapping, invalidParameters]
        const nameValueMapping = bulkResults.reduce(
          (map, r) => ({ ...map, ...r[0] }),
          {}
        );
        dispatch({
          type: FETCH_PARAMETER_VALUES_SUCCESS,
          payload: { names: Object.keys(nameValueMapping), nameValueMapping }
        });

        const invalidParameters = bulkResults.reduce(
          (lst, r) => [...lst, ...r[1]],
          []
        );

        if (invalidParameters.length) {
          dispatch({
            type: FETCH_PARAMETER_VALUES_FAILURE,
            payload: { names: invalidParameters }
          });
        }

        return [nameValueMapping, invalidParameters];
      }
    );
  };

// Each load gets a number; only the latest load may change the state, so a
// load for an old profile or region can't overwrite a newer one.
let latestLoad = 0;

// A refresh keeps the loaded parameters until the new list arrives. `reset`
// drops them first, for when the profile or region changed.
const fetchAllParameters =
  ({ reset = false } = {}) =>
  async (dispatch, getState) => {
    latestLoad += 1;
    const load = latestLoad;
    const isCurrent = () => load === latestLoad;
    dispatch({ type: FETCH_ALL_PARAMETERS_REQUEST, payload: { reset } });

    let allParameters = [];
    let nextToken;

    try {
      do {
        // Pages are loaded one after another so the table fills in progressively.

        const page = await api.describeParameters(nextToken);
        if (!isCurrent()) return;

        dispatch({
          type: FETCH_ALL_PARAMETERS_BATCH_LOADED,
          payload: page.parameters
        });

        const names = page.parameters.map(p => p.Name);
        if (names.length) {
          // initiate the action creator to fetch parameter values
          dispatch(fetchParameterValues(names, isCurrent));
        }

        allParameters = [...allParameters, ...page.parameters];
        ({ nextToken } = page);
      } while (nextToken);
    } catch (err) {
      if (!isCurrent()) return;
      const kind = classifyFetchError(err);
      dispatch({
        type: FETCH_ALL_PARAMETERS_FAILURE,
        payload: { kind, message: describeError(err) }
      });
      // Expired sessions and denied access get their own screen instead.
      if (kind) return;
      feedback.notification.error({
        message:
          'Parameters were not loaded. Check your AWS Connections (~/.aws/credentials, STSKey, or environment variables)',
        description: describeError(err)
      });
      return;
    }

    // Creations and deletions made while loading are newer than the list.
    const { created, deleted } = getState().parameters.changesDuringLoad;
    const names = [
      ...new Set([
        ...allParameters
          .map(p => p.Name)
          .filter(name => !deleted.includes(name)),
        ...created
      ])
    ];
    dispatch({ type: FETCH_ALL_PARAMETERS_SUCCESS, payload: { names } });
  };

const fetchKmsKeys = () => dispatch => {
  dispatch({ type: FETCH_KMS_KEYS_REQUEST });

  return api
    .listKmsAliases()
    .then(aliases => {
      dispatch({ type: FETCH_KMS_KEYS_SUCCESS, payload: aliases });
      return aliases;
    })
    .catch(err => {
      dispatch({ type: FETCH_KMS_KEYS_FAILURE });
      console.error('Something went wrong while fetching KMS Keys.', err);
      return [];
    });
};

const createServiceParameters =
  ({ serviceName, name, environments, ...rest }, overwrite = false) =>
  dispatch => {
    dispatch({ type: CREATE_SERVICE_PARAMETERS_REQUEST });

    const genericParameterNames = environments.map(
      env => `/services/${env}/${serviceName}/${name}`
    );

    const promises = genericParameterNames.map(gName =>
      dispatch(createGenericParameter({ ...rest, name: gName }, overwrite))
    );

    return Promise.all(promises)
      .then(results => {
        dispatch({
          type: CREATE_SERVICE_PARAMETERS_SUCCESS,
          payload: results
        });
        return results;
      })
      .catch(err => {
        dispatch({ type: CREATE_SERVICE_PARAMETERS_FAILURE, payload: err });
        throw err;
      });
  };

const createGenericParameter =
  ({ name, description, type, kmsKey, value }, overwrite = false) =>
  dispatch => {
    dispatch({ type: CREATE_GENERIC_PARAMETER_REQUEST });

    // Shape of a parameter as SSM returns it, used to update the table locally.
    const params = {
      Name: name,
      Type: type,
      Value: value,
      Description: description,
      KeyId: type === 'SecureString' ? kmsKey : undefined
    };
    return api
      .putParameter({ name, type, value, description, kmsKey, overwrite })
      .then(res => {
        dispatch({
          type: CREATE_GENERIC_PARAMETER_SUCCESS,
          payload: { response: res, params }
        });
        return res;
      })
      .catch(err => {
        dispatch({ type: CREATE_GENERIC_PARAMETER_FAILURE, payload: err });
        throw err;
      });
  };

const deleteParameter = name => dispatch => {
  dispatch({ type: DELETE_PARAMETER_REQUEST });

  return api
    .deleteParameter(name)
    .then(res => {
      dispatch({
        type: DELETE_PARAMETER_SUCCESS,
        payload: { response: res, name }
      });
      return res;
    })
    .catch(err => {
      dispatch({ type: DELETE_PARAMETER_FAILURE, payload: err });
      throw err;
    });
};

export const actions = {
  fetchAllParameters,
  fetchKmsKeys,
  createServiceParameters,
  createGenericParameter,
  deleteParameter
};

function parameterNames(state = [], action) {
  switch (action.type) {
    case FETCH_ALL_PARAMETERS_REQUEST:
      return action.payload.reset ? [] : state;
    case FETCH_ALL_PARAMETERS_BATCH_LOADED: {
      return [...new Set([...state, ...action.payload.map(res => res.Name)])];
    }
    // Drops parameters that were deleted outside the app since the last load.
    case FETCH_ALL_PARAMETERS_SUCCESS:
      return action.payload.names;
    case CREATE_GENERIC_PARAMETER_SUCCESS: {
      return [...new Set([...state, action.payload.params.Name])];
    }
    case DELETE_PARAMETER_SUCCESS: {
      return state.filter(name => name !== action.payload.name);
    }
    default:
      return state;
  }
}

function parametersByName(state = {}, action) {
  switch (action.type) {
    case FETCH_ALL_PARAMETERS_REQUEST:
      return action.payload.reset ? {} : state;
    case FETCH_ALL_PARAMETERS_SUCCESS:
      return pick(state, action.payload.names);
    case FETCH_ALL_PARAMETERS_BATCH_LOADED: {
      const mapping = action.payload.reduce(
        (map, parameter) => ({
          ...map,
          [parameter.Name]: parameter
        }),
        {}
      );
      return { ...state, ...mapping };
    }
    case CREATE_GENERIC_PARAMETER_SUCCESS: {
      const parameter = {
        ...action.payload.params,
        LastModifiedDate: new Date(),
        LastModifiedUser: 'Parameter Store Manager',
        LoadedLocally: true,
        Version: action.payload.response.version || 1
      };
      return { ...state, [action.payload.params.Name]: parameter };
    }
    case DELETE_PARAMETER_SUCCESS:
      return withoutKey(state, action.payload.name);
    default:
      return state;
  }
}

function valuesByName(state = {}, action) {
  switch (action.type) {
    case FETCH_ALL_PARAMETERS_REQUEST:
      return action.payload.reset ? {} : state;
    case FETCH_ALL_PARAMETERS_SUCCESS:
      return pick(state, action.payload.names);
    case FETCH_PARAMETER_VALUES_SUCCESS: {
      return { ...state, ...action.payload.nameValueMapping };
    }
    case CREATE_GENERIC_PARAMETER_SUCCESS: {
      const parameter = {
        ...action.payload.params,
        LastModifiedDate: new Date(),
        LastModifiedUser: 'Parameter Store Manager',
        LoadedLocally: true,
        Version: action.payload.response.version || 1
      };
      return { ...state, [action.payload.params.Name]: parameter };
    }
    case DELETE_PARAMETER_SUCCESS:
      return withoutKey(state, action.payload.name);
    default:
      return state;
  }
}

function lastUpdatedDate(state = {}, action) {
  switch (action.type) {
    case FETCH_ALL_PARAMETERS_SUCCESS:
      return { ...state, FETCH_ALL_PARAMETERS: new Date() };
    default:
      return state;
  }
}

function isLoading(state = {}, action) {
  switch (action.type) {
    case FETCH_ALL_PARAMETERS_REQUEST:
      return { ...state, FETCH_ALL_PARAMETERS: true };
    case FETCH_ALL_PARAMETERS_FAILURE:
    case FETCH_ALL_PARAMETERS_SUCCESS:
      return { ...state, FETCH_ALL_PARAMETERS: false };
    case FETCH_KMS_KEYS_REQUEST:
      return { ...state, FETCH_KMS_KEYS: true };
    case FETCH_KMS_KEYS_FAILURE:
    case FETCH_KMS_KEYS_SUCCESS:
      return { ...state, FETCH_KMS_KEYS: false };

    default:
      return state;
  }
}

function isLoaded(state = {}, action) {
  switch (action.type) {
    case FETCH_ALL_PARAMETERS_REQUEST:
    case FETCH_ALL_PARAMETERS_FAILURE:
      return { ...state, FETCH_ALL_PARAMETERS: false };
    case FETCH_ALL_PARAMETERS_SUCCESS:
      return { ...state, FETCH_ALL_PARAMETERS: true };
    case FETCH_KMS_KEYS_REQUEST:
    case FETCH_KMS_KEYS_FAILURE:
      return { ...state, FETCH_KMS_KEYS: false };
    case FETCH_KMS_KEYS_SUCCESS:
      return { ...state, FETCH_KMS_KEYS: true };

    default:
      return state;
  }
}

function hasError(state = {}, action) {
  switch (action.type) {
    case FETCH_ALL_PARAMETERS_REQUEST:
    case FETCH_ALL_PARAMETERS_SUCCESS:
      return { ...state, FETCH_ALL_PARAMETERS: false };
    case FETCH_ALL_PARAMETERS_FAILURE:
      return { ...state, FETCH_ALL_PARAMETERS: true };
    case FETCH_KMS_KEYS_REQUEST:
    case FETCH_KMS_KEYS_SUCCESS:
      return { ...state, FETCH_KMS_KEYS: false };
    case FETCH_KMS_KEYS_FAILURE:
      return { ...state, FETCH_KMS_KEYS: true };
    default:
      return state;
  }
}

// Names created or deleted in the app while a load runs. The loaded list is
// older than these changes, so they are applied on top of it.
function changesDuringLoad(state = { created: [], deleted: [] }, action) {
  switch (action.type) {
    case FETCH_ALL_PARAMETERS_REQUEST:
      return { created: [], deleted: [] };
    case CREATE_GENERIC_PARAMETER_SUCCESS: {
      const name = action.payload.params.Name;
      return {
        created: [...state.created, name],
        deleted: state.deleted.filter(n => n !== name)
      };
    }
    case DELETE_PARAMETER_SUCCESS: {
      const { name } = action.payload;
      return {
        created: state.created.filter(n => n !== name),
        deleted: [...state.deleted, name]
      };
    }
    default:
      return state;
  }
}

// { kind, message } of the last failed load; kind is null unless the error
// has its own screen (see utils/awsErrors).
function fetchError(state = null, action) {
  switch (action.type) {
    case FETCH_ALL_PARAMETERS_REQUEST:
    case FETCH_ALL_PARAMETERS_SUCCESS:
      return null;
    case FETCH_ALL_PARAMETERS_FAILURE:
      return action.payload;
    default:
      return state;
  }
}

function kmsKeys(state = [], action) {
  switch (action.type) {
    case FETCH_KMS_KEYS_SUCCESS:
      return action.payload;

    default:
      return state;
  }
}

const parametersReducer = combineReducers({
  names: parameterNames,
  parametersByName,
  valuesByName,
  isLoading,
  isLoaded,
  hasError,
  kmsKeys,
  lastUpdatedDate,
  fetchError,
  changesDuringLoad
});

export default parametersReducer;

// - SELECTORS

const getNames = state => state.parameters.names;
const getParametersByName = state => state.parameters.parametersByName;
const getValuesByName = state => state.parameters.valuesByName;
const getAllParameters = createSelector(
  [getNames, getParametersByName, getValuesByName],
  (names, parametersMap, valuesMap) => {
    // A name without metadata can't be shown; skipping it keeps one stale
    // name from breaking the whole list.
    return [...names]
      .filter(name => parametersMap[name])
      .sort()
      .map(name => ({ ...parametersMap[name], ...valuesMap[name] }));
  }
);

const getIsAllParametersLoaded = state =>
  state.parameters.isLoaded.FETCH_ALL_PARAMETERS;
const getIsAllParametersLoading = state =>
  state.parameters.isLoading.FETCH_ALL_PARAMETERS;
const getHasAllParametersErrored = state =>
  state.parameters.hasError.FETCH_ALL_PARAMETERS;

const getLastUpdatedDate = state => state.parameters.lastUpdatedDate;

const getAllParametersLastUpdatedDate = createSelector(
  [getLastUpdatedDate],
  lastUpdatedDates => lastUpdatedDates.FETCH_ALL_PARAMETERS
);

const getFetchError = state => state.parameters.fetchError;

export const LOAD_STATES = {
  loading: 'loading',
  ready: 'ready',
  empty: 'empty',
  error: 'error',
  expired: 'expired',
  denied: 'denied'
};

// What the main area shows. Data that is already loaded stays visible while
// a refresh runs or after a refresh fails with a generic error.
const getLoadState = createSelector(
  [getNames, getFetchError, getIsAllParametersLoaded],
  (names, error, loaded) => {
    if (error && error.kind) return LOAD_STATES[error.kind];
    if (names.length) return LOAD_STATES.ready;
    if (error) return LOAD_STATES.error;
    return loaded ? LOAD_STATES.empty : LOAD_STATES.loading;
  }
);

const getIsKmsKeyLoaded = state => state.parameters.isLoaded.FETCH_KMS_KEYS;
const getIsKmsKeyLoading = state => state.parameters.isLoading.FETCH_KMS_KEYS;
const getKmsKeyLoadHasError = state => state.parameters.hasError.FETCH_KMS_KEYS;
const getKmsKeys = state => state.parameters.kmsKeys;

export const selectors = {
  getAllParameters,
  getNames,
  getParametersByName,
  getValuesByName,
  getFetchError,
  getLoadState,
  getIsAllParametersLoaded,
  getIsAllParametersLoading,
  getHasAllParametersErrored,
  getIsKmsKeyLoaded,
  getIsKmsKeyLoading,
  getKmsKeyLoadHasError,
  getKmsKeys,
  getAllParametersLastUpdatedDate
};
