// A stand-in for clients/api. Use with:
//   vi.mock('../clients/api', () => import('../test/mockApi'));
// and set the resolved values per test.
import { vi } from 'vitest';
import { DEFAULT_SETTINGS } from '../../shared/availableSettings';
import type * as api from '../clients/api';
import type { ParameterEntry } from '../state/parameters';

export const describeParameters = vi.fn<typeof api.describeParameters>();
export const getParameters = vi.fn<typeof api.getParameters>();
export const putParameter = vi.fn<typeof api.putParameter>();
export const deleteParameter = vi.fn<typeof api.deleteParameter>();
export const listKmsAliases = vi.fn<typeof api.listKmsAliases>(() =>
  Promise.resolve([])
);
export const listProfiles = vi.fn<typeof api.listProfiles>(() =>
  Promise.resolve({ profiles: [], envProfile: null })
);
export const setSettings = vi.fn<typeof api.setSettings>(values =>
  Promise.resolve({ ...DEFAULT_SETTINGS, ...values })
);
export const getAllSettings = vi.fn<typeof api.getAllSettings>(() =>
  Promise.resolve(DEFAULT_SETTINGS)
);
export const onSettingsChange = vi.fn<typeof api.onSettingsChange>(
  () => () => {}
);

// Makes describeParameters/getParameters serve `parameters` as AWS would.
export const serveParameters = (parameters: ParameterEntry[]) => {
  describeParameters.mockResolvedValue({
    // DescribeParameters doesn't return values.
    parameters: parameters.map(p => ({ ...p, Value: undefined }))
  });
  getParameters.mockImplementation(names =>
    Promise.resolve({
      parameters: parameters.filter(p => names.includes(p.Name)),
      invalidParameters: []
    })
  );
};
