// Moving around the parameter list and its sidebar tree.
import {
  convert,
  isServiceLocation,
  locationInEnv,
  locationOf,
  mainAreaLists,
  nextLastEnv,
  treeKeysTo,
  validate
} from '../../utils/location';
import type { Location, LocationView } from '../../utils/location';
import { createMatcher } from '../../utils/search';
import { mergeKeys } from '../../utils/sets';
import { getLocationContext, getSettings } from '../settings';
import { selectParameter } from './pane';
import { get, getLocation, initialUiState, set } from './store';

const expand = (view: LocationView, keys: string[]) =>
  set(state => ({
    expanded: {
      ...state.expanded,
      [view]: mergeKeys(state.expanded[view], keys)
    }
  }));

export const setQuery = (query: string) => set({ query });

// Going somewhere also expands the tree to it, and makes its environment
// the one other services open on. A sidebar click into another service
// passes `rememberEnv: false`: that service may have fallen back to another
// environment, and the one picked before should still apply to the rest.
export const setLocation = (next: Location, { rememberEnv = true } = {}) => {
  const { defaultView } = getSettings();
  const context = getLocationContext();
  const location = validate(next, context, {
    defaultView,
    lastEnv: get().lastEnv
  });
  expand(location.view, treeKeysTo(location, context));
  set(state => ({
    location,
    lastEnv: rememberEnv ? nextLastEnv(location, state.lastEnv) : state.lastEnv
  }));
};

export const setScope = (scope: string) =>
  setLocation({ view: 'paths', scope });

// Shows another environment of the service, in the same folder.
export const setEnv = (env: string) => {
  const location = getLocation();
  if (!isServiceLocation(location)) return;
  setLocation({ ...location, env });
};

// Switches the view. A selected parameter stays selected and the view opens
// on its folder; otherwise it goes to the same place in the new view.
export const setView = (view: LocationView) => {
  const current = getLocation();
  if (current.view === view) return;
  const context = getLocationContext();
  const { selectedName } = get();
  setLocation(
    selectedName
      ? locationOf(selectedName, view, context)
      : convert(current, view, context)
  );
};

// The same view's starting place, for when the folders mean something else:
// another account or region, or another delimiter. The service is kept.
export const resetLocation = () => {
  const location = getLocation();
  if (location.view === 'paths') setLocation({ view: 'paths', scope: '' });
  else setLocation({ ...location, folder: '' });
};

export const setExpanded = (view: LocationView, keys: string[]) =>
  set(state => ({ expanded: { ...state.expanded, [view]: keys } }));

export const collapseAll = () => set({ expanded: initialUiState.expanded });

// Shows a parameter that was just created: selects it, expands the tree to
// it and goes to its folder unless the main area already lists it.
export const showCreatedParameter = (name: string) => {
  const context = getLocationContext();
  set({ query: '' });
  const current = getLocation();
  const own = locationOf(name, current.view, context);
  if (!mainAreaLists(current, name, context, get().compare)) {
    setLocation(own);
  }
  expand(own.view, treeKeysTo(own, context));
  selectParameter(name);
};

// Selects `name`, the selected parameter's key in another environment, and
// moves the table to it: another environment tab in the Services view, the
// same place in that environment in the Environments and Paths views. A
// search that leaves it out is cleared, so the table lists it.
export const showInEnvironment = (name: string) => {
  const context = getLocationContext();
  if (!createMatcher(get().query, context.delimiter).test(name)) setQuery('');
  setLocation(locationInEnv(getLocation(), name, context));
  selectParameter(name);
};
