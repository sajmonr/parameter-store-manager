// The page shown, and the Settings page's section.
import { useImportStore } from '../import';
import { set } from './store';
import type { Page, SettingsSection } from './types';

// An import can't be left until it finishes: its review shows what failed.
const importing = () => useImportStore.getState().running;

// Pages stay mounted while hidden, so each keeps its state.
export const showPage = (page: Page) => {
  if (!importing()) set({ page });
};

export const showSettingsSection = (settingsSection: SettingsSection) =>
  set({ settingsSection });

// Without a section, Settings opens on the one used last.
export const openSettings = (section?: SettingsSection) => {
  if (importing()) return;
  set(state => ({
    page: 'settings',
    settingsSection: section ?? state.settingsSection
  }));
};
