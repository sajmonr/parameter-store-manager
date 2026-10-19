// UI state shared by the header, folder tree, table and detail pane.
import { create } from 'zustand';
import type { EditableParameterType } from '../../main/endpoints/parameters/putParameter/putParameter.contract';
import { folderOf, foldersOf } from '../utils/paths';
import { getPathDelimiter } from './settings';

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
  // Folder path ending in the delimiter; '' means all parameters.
  scope: string;
  query: string;
  expandedFolders: string[];
  selectedName: string | null;
  // null while the pane is closed.
  paneMode: PaneMode | null;
  newPrefill: NewParameterPrefill | null;
  // The section the Settings page shows; kept while the page is hidden.
  settingsSection: SettingsSection;
  exportOpen: boolean;
}

export const initialUiState: UiState = {
  page: 'parameters',
  scope: '',
  query: '',
  expandedFolders: [],
  selectedName: null,
  paneMode: null,
  newPrefill: null,
  settingsSection: 'aws',
  exportOpen: false
};

export const useUiStore = create<UiState>()(() => initialUiState);

const set = useUiStore.setState;
const get = useUiStore.getState;

const expandFolders = (keys: string[]) =>
  set(state => ({
    expandedFolders: [...new Set([...state.expandedFolders, ...keys])]
  }));

const setQuery = (query: string) => set({ query });

// Scoping to a folder also expands the path to it in the tree.
const setScope = (scope: string) => {
  expandFolders(foldersOf(scope, getPathDelimiter()));
  set({ scope });
};

const setExpandedFolders = (expandedFolders: string[]) =>
  set({ expandedFolders });

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

const openExport = () => set({ exportOpen: true });
const closeExport = () => set({ exportOpen: false });

// Shows a parameter that was just created: selects it, expands its folder
// and moves the scope to that folder unless the parameter is already in it.
const showCreatedParameter = (name: string) => {
  const delimiter = getPathDelimiter();
  set({ query: '' });
  if (!name.startsWith(get().scope)) setScope(folderOf(name, delimiter));
  expandFolders(foldersOf(name, delimiter));
  selectParameter(name);
};

export const uiActions = {
  setQuery,
  setScope,
  setExpandedFolders,
  selectParameter,
  openNewParameter,
  closePane,
  openSettings,
  showSettingsSection,
  openExport,
  closeExport,
  showCreatedParameter,
  showPage
};
