import { combineReducers } from 'redux';
import chunk from 'lodash/chunk';
import pAll from 'p-all';
import { createSelector } from 'reselect';
import * as api from '../clients/api';
import { feedback } from '../feedback';

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

const describeError = err => [err.code, err.message].filter(Boolean).join(': ');

const fetchParameterValues = names => dispatch => {
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
          console.error('Something went wrong while fetching parameters', err);

          dispatch({
            type: FETCH_PARAMETER_VALUES_FAILURE,
            payload: { names: currBatchNames }
          });
          return [{}, []];
        })
  );

  return pAll(getParameterRequestActions, { concurrency: 2 }).then(
    bulkResults => {
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

const fetchAllParameters = () => async dispatch => {
  dispatch({ type: FETCH_ALL_PARAMETERS_REQUEST });

  let allParameters = [];
  let nextToken;

  try {
    do {
      // Pages are loaded one after another so the table fills in progressively.

      const page = await api.describeParameters(nextToken);

      dispatch({
        type: FETCH_ALL_PARAMETERS_BATCH_LOADED,
        payload: page.parameters
      });

      const names = page.parameters.map(p => p.Name);
      if (names.length) {
        // initiate the action creator to fetch parameter values
        dispatch(fetchParameterValues(names));
      }

      allParameters = [...allParameters, ...page.parameters];
      ({ nextToken } = page);
    } while (nextToken);
  } catch (err) {
    dispatch({ type: FETCH_ALL_PARAMETERS_FAILURE, payload: err });
    feedback.notification.error({
      message:
        'Parameters were not loaded. Check your AWS Connections (~/.aws/credentials, STSKey, or environment variables)',
      description: describeError(err)
    });
    return;
  }

  dispatch({ type: FETCH_ALL_PARAMETERS_SUCCESS, payload: allParameters });
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
    // reset if fetch all request comes in
    case FETCH_ALL_PARAMETERS_REQUEST:
      return [];
    case FETCH_ALL_PARAMETERS_BATCH_LOADED: {
      return [...new Set([...state, ...action.payload.map(res => res.Name)])];
    }
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
    default:
      return state;
  }
}

function valuesByName(state = {}, action) {
  switch (action.type) {
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
    default:
      return state;
  }
}

const fetchParameterValuesKey = name => `FETCH_PARAMETER_VALUES:${name}`;
const setAllTo = (bool, stringKeys) =>
  stringKeys.reduce((map, stringKey) => {
    map[stringKey] = bool;
    return map;
  }, {});

function lastUpdatedDate(state = {}, action) {
  switch (action.type) {
    case FETCH_ALL_PARAMETERS_SUCCESS:
      return { ...state, FETCH_ALL_PARAMETERS: new Date() };
    case FETCH_KMS_KEYS_REQUEST:
      return { ...state, FETCH_KMS_KEYS: true };
    case FETCH_KMS_KEYS_FAILURE:
    case FETCH_KMS_KEYS_SUCCESS:
      return { ...state, FETCH_KMS_KEYS: new Date() };

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
    case FETCH_PARAMETER_VALUES_REQUEST:
      return {
        ...state,
        ...setAllTo(
          true,
          action.payload.names.map(name => fetchParameterValuesKey(name))
        )
      };
    case FETCH_PARAMETER_VALUES_SUCCESS:
    case FETCH_PARAMETER_VALUES_FAILURE:
      return {
        ...state,
        ...setAllTo(
          false,
          action.payload.names.map(name => fetchParameterValuesKey(name))
        )
      };
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
    case FETCH_PARAMETER_VALUES_REQUEST:
    case FETCH_PARAMETER_VALUES_FAILURE:
      return {
        ...state,
        ...setAllTo(
          false,
          action.payload.names.map(name => fetchParameterValuesKey(name))
        )
      };
    case FETCH_PARAMETER_VALUES_SUCCESS:
      return {
        ...state,
        ...setAllTo(
          true,
          action.payload.names.map(name => fetchParameterValuesKey(name))
        )
      };

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
    case FETCH_PARAMETER_VALUES_REQUEST:
    case FETCH_PARAMETER_VALUES_SUCCESS:
      return {
        ...state,
        ...setAllTo(
          false,
          action.payload.names.map(name => fetchParameterValuesKey(name))
        )
      };
    case FETCH_PARAMETER_VALUES_FAILURE:
      return {
        ...state,
        ...setAllTo(
          true,
          action.payload.names.map(name => fetchParameterValuesKey(name))
        )
      };
    case FETCH_KMS_KEYS_REQUEST:
    case FETCH_KMS_KEYS_SUCCESS:
      return { ...state, FETCH_KMS_KEYS: false };
    case FETCH_KMS_KEYS_FAILURE:
      return { ...state, FETCH_KMS_KEYS: true };
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
  lastUpdatedDate
});

export default parametersReducer;

// - SELECTORS

const getNames = state => state.parameters.names;
const getParametersByName = state => state.parameters.parametersByName;
const getValuesByName = state => state.parameters.valuesByName;
const getAllParameters = createSelector(
  [getNames, getParametersByName, getValuesByName],
  (names, parametersMap, valuesMap) => {
    return [...names]
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

const getIsKmsKeyLoaded = state => state.parameters.isLoaded.FETCH_KMS_KEYS;
const getIsKmsKeyLoading = state => state.parameters.isLoading.FETCH_KMS_KEYS;
const getKmsKeyLoadHasError = state => state.parameters.hasError.FETCH_KMS_KEYS;
const getKmsKeys = state => state.parameters.kmsKeys;

const getAllServiceNames = createSelector([getNames], names => {
  const regex = /\/services\/.+\/([\w\d]+)\/.+/;
  return [
    ...new Set(
      names.map(name => {
        const matches = name.match(regex);
        return matches ? matches[1] : null;
      })
    )
  ].filter(name => name);
});

export const selectors = {
  getAllParameters,
  getIsAllParametersLoaded,
  getIsAllParametersLoading,
  getHasAllParametersErrored,
  getIsKmsKeyLoaded,
  getIsKmsKeyLoading,
  getKmsKeyLoadHasError,
  getKmsKeys,
  getAllServiceNames,
  getAllParametersLastUpdatedDate
};
