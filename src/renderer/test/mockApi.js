// A stand-in for clients/api. Use with:
//   vi.mock('../clients/api', () => import('../test/mockApi'));
// and set the resolved values per test.
import { vi } from 'vitest';

export const describeParameters = vi.fn();
export const getParameters = vi.fn();
export const putParameter = vi.fn();
export const deleteParameter = vi.fn();
export const listKmsAliases = vi.fn(() => Promise.resolve([]));
export const listProfiles = vi.fn(() => Promise.resolve([]));
export const setSettings = vi.fn(values => Promise.resolve(values));
export const getAllSettings = vi.fn(() => Promise.resolve({}));
export const onSettingsChange = vi.fn();

// Makes describeParameters/getParameters serve `parameters` as AWS would.
export const serveParameters = parameters => {
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
