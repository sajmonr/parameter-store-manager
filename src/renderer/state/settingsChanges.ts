// Saving settings from the Settings page. A setting can change what the rest
// of the app shows, so the UI state that doesn't carry over is reset here.
import type { Settings } from '../../shared/availableSettings';
import type { Structure } from '../../shared/structure';
import { getSettings, saveSettings } from './settings';
import { uiActions } from './ui';

// Parameters and KMS keys are loaded per profile and region, so a change
// there loads them again by itself. The open pane and the folder don't carry
// over (the view and service do), and a new delimiter makes the expanded
// folders meaningless. Turning grouping off goes back to the table. A removed
// service or environment needs nothing here: the location is validated
// whenever it is read.
export const saveSettingsAndApply = async (values: Partial<Settings>) => {
  const before = getSettings();
  await saveSettings(values);
  const after = getSettings();
  const sourceChanged =
    after.profile !== before.profile || after.ssmRegion !== before.ssmRegion;
  const delimiterChanged = after.pathDelimiter !== before.pathDelimiter;
  if (delimiterChanged) uiActions.collapseAll();
  // Only a service compares environments.
  if (!after.structure.enabled) uiActions.setCompare(false);
  if (sourceChanged || delimiterChanged) {
    uiActions.closePane();
    uiActions.resetLocation();
  }
};

// Saves run one at a time, each changing the structure saved by the one
// before it, so quick edits (ticking several boxes) don't overwrite each other.
let structureSaves: Promise<unknown> = Promise.resolve();

export const updateStructure = (
  change: (structure: Structure) => Structure
) => {
  const save = structureSaves.then(() =>
    saveSettingsAndApply({ structure: change(getSettings().structure) })
  );
  structureSaves = save.catch(() => {});
  return save;
};
