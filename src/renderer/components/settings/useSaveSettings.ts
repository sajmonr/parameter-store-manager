import type { Settings } from '../../../shared/availableSettings';
import type { Structure } from '../../../shared/structure';
import { notifyError } from '../../utils/notify';
import {
  saveSettingsAndApply,
  updateStructure
} from '../../state/settingsChanges';

// A failed save leaves the saved value in the store, so the control shows it
// again. Resolves to whether it saved.
const useNotifyFailure = () => {
  return (save: Promise<unknown>) =>
    save.then(
      () => true,
      (error: unknown) => {
        notifyError('The setting was not saved', error);
        return false;
      }
    );
};

// For controls that save on change.
const useSaveSettings = () => {
  const notify = useNotifyFailure();
  return (values: Partial<Settings>) => notify(saveSettingsAndApply(values));
};

// For controls that change part of the structure setting.
export const useUpdateStructure = () => {
  const notify = useNotifyFailure();
  return (change: (structure: Structure) => Structure) =>
    notify(updateStructure(change));
};

export default useSaveSettings;
