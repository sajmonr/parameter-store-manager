// A stand-in for ../services. Use with:
//   vi.mock('../services', () => import('../test/mockServices'));
// and set the resolved values per test.
import { vi } from 'vitest';
import { DEFAULT_SETTINGS } from '../../shared/availableSettings';
import type * as services from '../services';
import type { ParameterEntry } from '../state/parameters';

type Service<K extends keyof typeof services> = (typeof services)[K];

export const parametersService = {
  describe: vi.fn<Service<'parametersService'>['describe']>(),
  getValues: vi.fn<Service<'parametersService'>['getValues']>(),
  put: vi.fn<Service<'parametersService'>['put']>(),
  delete: vi.fn<Service<'parametersService'>['delete']>()
};

export const kmsService = {
  listAliases: vi.fn<Service<'kmsService'>['listAliases']>(() =>
    Promise.resolve([])
  )
};

export const profilesService = {
  list: vi.fn<Service<'profilesService'>['list']>(() =>
    Promise.resolve({ profiles: [], envProfile: null })
  )
};

export const settingsService = {
  getAll: vi.fn<Service<'settingsService'>['getAll']>(() =>
    Promise.resolve(DEFAULT_SETTINGS)
  ),
  set: vi.fn<Service<'settingsService'>['set']>(values =>
    Promise.resolve({ ...DEFAULT_SETTINGS, ...values })
  ),
  onChange: vi.fn<Service<'settingsService'>['onChange']>(() => () => {})
};

export const updatesService = {
  check: vi.fn<Service<'updatesService'>['check']>(() =>
    Promise.resolve({ status: 'skipped' })
  ),
  openReleasePage: vi.fn<Service<'updatesService'>['openReleasePage']>(() =>
    Promise.resolve()
  )
};

export const filesService = {
  save: vi.fn<Service<'filesService'>['save']>(() =>
    Promise.resolve('/Downloads/export.csv')
  )
};

export const accountService = {
  getId: vi.fn<Service<'accountService'>['getId']>(() =>
    Promise.resolve('123456789012')
  )
};

export const sourceService = {
  get: vi.fn<Service<'sourceService'>['get']>(() => Promise.resolve('aws'))
};

export const menuService = {
  onOpenSettings: vi.fn<Service<'menuService'>['onOpenSettings']>(
    () => () => {}
  )
};

// Makes the parameters service serve `parameters` as AWS would.
export const serveParameters = (parameters: ParameterEntry[]) => {
  parametersService.describe.mockResolvedValue({
    // DescribeParameters doesn't return values.
    parameters: parameters.map(p => ({ ...p, Value: undefined }))
  });
  parametersService.getValues.mockImplementation(names =>
    Promise.resolve({
      parameters: parameters.filter(p => names.includes(p.Name)),
      invalidParameters: []
    })
  );
};
