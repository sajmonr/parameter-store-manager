import { App } from 'antd';
import type { Settings } from '../../../shared/availableSettings';
import { saveSettingsAndApply } from '../../state/settingsChanges';

// For controls that save on change. A failed save leaves the saved value in
// the store, so the control shows it again.
const useSaveSettings = () => {
  const { notification } = App.useApp();
  return (values: Partial<Settings>) =>
    saveSettingsAndApply(values).catch((error: Error) =>
      notification.error({
        title: 'The setting was not saved',
        description: error.message
      })
    );
};

export default useSaveSettings;
