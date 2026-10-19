// Settings, UI state and loaded parameters for state and component tests.
import { DEFAULT_SETTINGS } from '../../shared/availableSettings';
import type { Settings } from '../../shared/availableSettings';
import { exportActions } from '../state/export';
import { parametersKey } from '../state/parameters';
import type { ParameterEntry, ParameterList } from '../state/parameters';
import { createQueryClient } from '../state/queryClient';
import { useSettingsStore } from '../state/settings';
import { initialUiState, useUiStore } from '../state/ui';

export const makeParameter = (
  Name: string,
  extra: Partial<ParameterEntry> = {}
): ParameterEntry => ({
  Name,
  Type: 'String',
  Value: `value of ${Name}`,
  Version: 1,
  LastModifiedDate: new Date('2026-01-01T00:00:00Z'),
  ...extra
});

// Resets the settings, UI and export stores and returns a query client. With
// `parameters`, they are loaded as after a successful load; without, the
// first component that reads them starts a load.
export const createTestState = ({
  parameters = [],
  settings = {}
}: {
  parameters?: ParameterEntry[];
  settings?: Partial<Settings>;
} = {}) => {
  const fullSettings: Settings = {
    ...DEFAULT_SETTINGS,
    ssmRegion: 'us-east-1',
    kmsRegion: 'us-east-1',
    ...settings
  };
  useSettingsStore.setState(fullSettings, true);
  useUiStore.setState(initialUiState, true);
  exportActions.cancel();

  const queryClient = createQueryClient();
  if (parameters.length) {
    queryClient.setQueryData<ParameterList>(
      parametersKey(fullSettings.profile, fullSettings.ssmRegion),
      {
        byName: new Map(parameters.map(p => [p.Name, p])),
        syncedAt: new Date()
      }
    );
  }
  return queryClient;
};
