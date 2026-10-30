import {
  cancelDelete,
  closeCopy,
  finishDelete,
  openCopyDialog,
  requestDelete
} from './dialogs';
import {
  collapseAll,
  resetLocation,
  setEnv,
  setExpanded,
  setLocation,
  setQuery,
  setScope,
  setView,
  showCreatedParameter,
  showInEnvironment
} from './navigation';
import { openSettings, showPage, showSettingsSection } from './pages';
import {
  clearChecked,
  clearRevealed,
  closePane,
  openNewParameter,
  selectParameter,
  setChecked,
  setCompare,
  setCompareFilter,
  toggleReveal
} from './pane';

export * from './types';
export { getLocation, initialUiState, useUiStore } from './store';

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
  setChecked,
  clearChecked,
  setCompare,
  setCompareFilter,
  toggleReveal,
  clearRevealed,
  requestDelete,
  cancelDelete,
  finishDelete,
  openCopyDialog,
  closeCopy,
  openSettings,
  showSettingsSection,
  showCreatedParameter,
  showInEnvironment,
  showPage
};
