import { create } from 'zustand';
import { validate } from '../../utils/location';
import { getLocationContext, getSettings } from '../settings';
import type { UiState } from './types';

export const initialUiState: UiState = {
  page: 'parameters',
  location: null,
  lastEnv: null,
  query: '',
  expanded: { paths: [], services: [], environments: [] },
  selectedName: null,
  checked: { context: '', names: new Set() },
  compare: false,
  compareFilter: 'all',
  revealed: new Set(),
  pendingDelete: null,
  copyRequest: null,
  paneMode: null,
  newPrefill: null,
  settingsSection: 'aws'
};

export const useUiStore = create<UiState>()(() => initialUiState);

export const set = useUiStore.setState;
export const get = useUiStore.getState;

// The location, made valid for the current settings.
export const getLocation = () => {
  const { location, lastEnv } = get();
  const { defaultView } = getSettings();
  return validate(location, getLocationContext(), { defaultView, lastEnv });
};
