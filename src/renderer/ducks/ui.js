// UI state shared by the header, folder tree, table and detail pane.
import { createSelector } from 'reselect';
import { selectors as parameterSelectors } from './parameters';
import { selectors as settingsSelectors } from './settings';
import { buildFolderTree, folderOf, foldersOf } from '../utils/paths';
import { createMatcher } from '../utils/search';

const SET_QUERY = 'UI_SET_QUERY';
const SET_SCOPE = 'UI_SET_SCOPE';
const SET_EXPANDED_FOLDERS = 'UI_SET_EXPANDED_FOLDERS';
const EXPAND_FOLDERS = 'UI_EXPAND_FOLDERS';
const SELECT_PARAMETER = 'UI_SELECT_PARAMETER';
const OPEN_NEW_PARAMETER = 'UI_OPEN_NEW_PARAMETER';
const CLOSE_PANE = 'UI_CLOSE_PANE';
const SET_SETTINGS_OPEN = 'UI_SET_SETTINGS_OPEN';

export const PANE_MODES = { detail: 'detail', new: 'new' };

// - ACTIONS

const setQuery = query => ({ type: SET_QUERY, payload: query });

// Scoping to a folder also expands the path to it in the tree.
const setScope = scope => (dispatch, getState) => {
  const delimiter = settingsSelectors.getPathDelimiter(getState());
  dispatch({ type: EXPAND_FOLDERS, payload: foldersOf(scope, delimiter) });
  dispatch({ type: SET_SCOPE, payload: scope });
};

const setExpandedFolders = keys => ({
  type: SET_EXPANDED_FOLDERS,
  payload: keys
});

const selectParameter = name => ({ type: SELECT_PARAMETER, payload: name });

// `prefill` is { folder, name, description, type, kmsKey, value } when
// duplicating, or null for a blank form.
const openNewParameter = (prefill = null) => ({
  type: OPEN_NEW_PARAMETER,
  payload: prefill
});

const closePane = () => ({ type: CLOSE_PANE });

const openSettings = () => ({ type: SET_SETTINGS_OPEN, payload: true });
const closeSettings = () => ({ type: SET_SETTINGS_OPEN, payload: false });

// Shows a parameter that was just created: selects it, expands its folder
// and moves the scope to that folder unless the parameter is already in it.
const showCreatedParameter = name => (dispatch, getState) => {
  const state = getState();
  const delimiter = settingsSelectors.getPathDelimiter(state);
  const { scope } = state.ui;
  dispatch({ type: SET_QUERY, payload: '' });
  if (!name.startsWith(scope)) dispatch(setScope(folderOf(name, delimiter)));
  dispatch({ type: EXPAND_FOLDERS, payload: foldersOf(name, delimiter) });
  dispatch(selectParameter(name));
};

export const actions = {
  setQuery,
  setScope,
  setExpandedFolders,
  selectParameter,
  openNewParameter,
  closePane,
  openSettings,
  closeSettings,
  showCreatedParameter
};

// - REDUCER

const initialState = {
  // Folder path ending in the delimiter; '' means all parameters.
  scope: '',
  query: '',
  expandedFolders: [],
  selectedName: null,
  // PANE_MODES value, or null when the pane is closed.
  paneMode: null,
  newPrefill: null,
  settingsOpen: false
};

export default function uiReducer(state = initialState, action) {
  switch (action.type) {
    case SET_QUERY:
      return { ...state, query: action.payload };
    case SET_SCOPE:
      return { ...state, scope: action.payload };
    case SET_EXPANDED_FOLDERS:
      return { ...state, expandedFolders: action.payload };
    case EXPAND_FOLDERS:
      return {
        ...state,
        expandedFolders: [
          ...new Set([...state.expandedFolders, ...action.payload])
        ]
      };
    case SELECT_PARAMETER:
      return {
        ...state,
        selectedName: action.payload,
        paneMode: PANE_MODES.detail,
        newPrefill: null
      };
    case OPEN_NEW_PARAMETER:
      return {
        ...state,
        paneMode: PANE_MODES.new,
        newPrefill: action.payload
      };
    case CLOSE_PANE:
      return {
        ...state,
        selectedName: null,
        paneMode: null,
        newPrefill: null
      };
    case SET_SETTINGS_OPEN:
      return { ...state, settingsOpen: action.payload };
    default:
      return state;
  }
}

// - SELECTORS

const getScope = state => state.ui.scope;
const getQuery = state => state.ui.query;
const getExpandedFolders = state => state.ui.expandedFolders;
const getSelectedName = state => state.ui.selectedName;
const getPaneMode = state => state.ui.paneMode;
const getNewPrefill = state => state.ui.newPrefill;
const getIsSettingsOpen = state => state.ui.settingsOpen;

const getMatcher = createSelector(
  [getQuery, settingsSelectors.getPathDelimiter],
  createMatcher
);

// Parameters that match the search, in any folder.
const getMatchedParameters = createSelector(
  [parameterSelectors.getAllParameters, getMatcher],
  (parameters, matcher) => parameters.filter(p => matcher.test(p.Name))
);

// Parameters that match the search and sit in the scoped folder.
const getVisibleParameters = createSelector(
  [getMatchedParameters, getScope],
  (parameters, scope) =>
    scope ? parameters.filter(p => p.Name.startsWith(scope)) : parameters
);

// The sidebar tree shows where matches are, so it ignores the scope.
const getMatchedFolderTree = createSelector(
  [getMatchedParameters, settingsSelectors.getPathDelimiter],
  (parameters, delimiter) =>
    buildFolderTree(
      parameters.map(p => p.Name),
      delimiter
    )
);

// Every folder, for the folder picker in the new-parameter form.
const getAllFolderTree = createSelector(
  [parameterSelectors.getNames, settingsSelectors.getPathDelimiter],
  buildFolderTree
);

const getNameSet = createSelector(
  [parameterSelectors.getNames],
  names => new Set(names)
);

// The selected parameter with its value, or null if it no longer exists.
const getSelectedParameter = createSelector(
  [
    parameterSelectors.getParametersByName,
    parameterSelectors.getValuesByName,
    getSelectedName
  ],
  (parametersByName, valuesByName, name) =>
    name && parametersByName[name]
      ? { ...parametersByName[name], ...valuesByName[name] }
      : null
);

export const selectors = {
  getScope,
  getQuery,
  getExpandedFolders,
  getSelectedName,
  getPaneMode,
  getNewPrefill,
  getIsSettingsOpen,
  getMatcher,
  getMatchedParameters,
  getVisibleParameters,
  getMatchedFolderTree,
  getAllFolderTree,
  getNameSet,
  getSelectedParameter
};
