// UI state shared by the header, folder tree, table and detail pane.
import { create } from 'zustand';
import type { EditableParameterType } from '../../main/endpoints/parameters/putParameter/putParameter.contract';
import {
  contains,
  convert,
  isEnvironmentLocation,
  isServiceLocation,
  locationInEnv,
  locationOf,
  treeKeysTo,
  validate
} from '../utils/location';
import type { Location, LocationView } from '../utils/location';
import { createMatcher } from '../utils/search';
import { getLocationContext, getSettings } from './settings';

export type PaneMode = 'detail' | 'new';

export type Page = 'parameters' | 'importExport' | 'settings';

export type SettingsSection = 'aws' | 'services' | 'display';

// The new-parameter form's starting values when duplicating.
export interface NewParameterPrefill {
  folder?: string;
  name?: string;
  description?: string;
  type?: EditableParameterType;
  kmsKey?: string;
  value?: string;
}

export interface UiState {
  page: Page;
  // Where the parameter list is, as last set; null until then, which is the
  // default view's starting place. It can point at a service that was since
  // removed, so it is read through getLocation or useLocation.
  location: Location | null;
  // The environment last picked in a grouped view. Other services open on
  // it when they are in it.
  lastEnv: string | null;
  query: string;
  // The expanded tree nodes of each view.
  expanded: Record<LocationView, string[]>;
  selectedName: string | null;
  // null while the pane is closed.
  paneMode: PaneMode | null;
  newPrefill: NewParameterPrefill | null;
  // The section the Settings page shows; kept while the page is hidden.
  settingsSection: SettingsSection;
}

export const initialUiState: UiState = {
  page: 'parameters',
  location: null,
  lastEnv: null,
  query: '',
  expanded: { paths: [], services: [], environments: [] },
  selectedName: null,
  paneMode: null,
  newPrefill: null,
  settingsSection: 'aws'
};

export const useUiStore = create<UiState>()(() => initialUiState);

const set = useUiStore.setState;
const get = useUiStore.getState;

// The location, made valid for the current settings.
export const getLocation = () => {
  const { location, lastEnv } = get();
  const { defaultView } = getSettings();
  return validate(location, getLocationContext(), { defaultView, lastEnv });
};

const expand = (view: LocationView, keys: string[]) =>
  set(state => ({
    expanded: {
      ...state.expanded,
      [view]: [...new Set([...state.expanded[view], ...keys])]
    }
  }));

const setQuery = (query: string) => set({ query });

// Going somewhere also expands the tree to it, and makes its environment
// the one other services open on. A sidebar click into another service
// passes `rememberEnv: false`: that service may have fallen back to another
// environment, and the one picked before should still apply to the rest.
const setLocation = (next: Location, { rememberEnv = true } = {}) => {
  const { defaultView } = getSettings();
  const context = getLocationContext();
  const location = validate(next, context, {
    defaultView,
    lastEnv: get().lastEnv
  });
  expand(location.view, treeKeysTo(location, context));
  set(state => ({
    location,
    lastEnv:
      rememberEnv &&
      (isServiceLocation(location) || isEnvironmentLocation(location)) &&
      location.env
        ? location.env
        : state.lastEnv
  }));
};

const setScope = (scope: string) => setLocation({ view: 'paths', scope });

// Shows another environment of the service, in the same folder.
const setEnv = (env: string) => {
  const location = getLocation();
  if (!isServiceLocation(location)) return;
  setLocation({ ...location, env });
};

// Switches the view. A selected parameter stays selected and the view opens
// on its folder; otherwise it goes to the same place in the new view.
const setView = (view: LocationView) => {
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
const resetLocation = () => {
  const location = getLocation();
  if (location.view === 'paths') setLocation({ view: 'paths', scope: '' });
  else setLocation({ ...location, folder: '' });
};

const setExpanded = (view: LocationView, keys: string[]) =>
  set(state => ({ expanded: { ...state.expanded, [view]: keys } }));

const collapseAll = () => set({ expanded: initialUiState.expanded });

const selectParameter = (selectedName: string) =>
  set({ selectedName, paneMode: 'detail', newPrefill: null });

// `prefill` when duplicating, or null for a blank form.
const openNewParameter = (newPrefill: NewParameterPrefill | null = null) =>
  set({ paneMode: 'new', newPrefill });

const closePane = () =>
  set({ selectedName: null, paneMode: null, newPrefill: null });

// Pages stay mounted while hidden, so each keeps its state.
const showPage = (page: Page) => set({ page });

const showSettingsSection = (settingsSection: SettingsSection) =>
  set({ settingsSection });

// Without a section, Settings opens on the one used last.
const openSettings = (section?: SettingsSection) =>
  set(state => ({
    page: 'settings',
    settingsSection: section ?? state.settingsSection
  }));

// Shows a parameter that was just created: selects it, expands the tree to
// it and goes to its folder unless the table already lists it.
const showCreatedParameter = (name: string) => {
  const context = getLocationContext();
  set({ query: '' });
  const current = getLocation();
  const own = locationOf(name, current.view, context);
  if (!contains(current, name, context)) setLocation(own);
  expand(own.view, treeKeysTo(own, context));
  selectParameter(name);
};

// Selects `name`, the selected parameter's key in another environment, and
// moves the table to it: another environment tab in the Services view, the
// same place in that environment in the Environments and Paths views. A
// search that leaves it out is cleared, so the table lists it.
const showInEnvironment = (name: string) => {
  const context = getLocationContext();
  if (!createMatcher(get().query, context.delimiter).test(name)) setQuery('');
  setLocation(locationInEnv(getLocation(), name, context));
  selectParameter(name);
};

export const uiActions = {
  setQuery,
  setLocation,
  setScope,
  setEnv,
  setView,
  resetLocation,
  setExpanded,
  collapseAll,
  selectParameter,
  openNewParameter,
  closePane,
  openSettings,
  showSettingsSection,
  showCreatedParameter,
  showInEnvironment,
  showPage
};
