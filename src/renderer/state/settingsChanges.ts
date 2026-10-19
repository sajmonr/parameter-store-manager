// Saving settings from the Settings page. A setting can change what the rest
// of the app shows, so the UI state that doesn't carry over is reset here.
import type { Settings } from '../../shared/availableSettings';
import { getSettings, saveSettings } from './settings';
import { uiActions } from './ui';

// Parameters and KMS keys are loaded per profile and region, so a change
// there loads them again by itself. The open pane and the folder don't carry
// over, and a new delimiter makes the expanded folders meaningless.
export const saveSettingsAndApply = async (values: Partial<Settings>) => {
  const before = getSettings();
  await saveSettings(values);
  const after = getSettings();
  const sourceChanged =
    after.profile !== before.profile || after.ssmRegion !== before.ssmRegion;
  const delimiterChanged = after.pathDelimiter !== before.pathDelimiter;
  if (sourceChanged || delimiterChanged) {
    uiActions.closePane();
    uiActions.setScope('');
  }
  if (delimiterChanged) uiActions.setExpandedFolders([]);
};
