import { App } from 'antd';
import type { Settings } from '../../../shared/availableSettings';
import type { Structure } from '../../../shared/structure';
import {
  saveSettingsAndApply,
  updateStructure
} from '../../state/settingsChanges';

// A failed save leaves the saved value in the store, so the control shows it
// again. Resolves to whether it saved.
const useNotifyFailure = () => {
  const { notification } = App.useApp();
  return (save: Promise<unknown>) =>
    save.then(
      () => true,
      (error: Error) => {
        notification.error({
          title: 'The setting was not saved',
          description: error.message
        });
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
