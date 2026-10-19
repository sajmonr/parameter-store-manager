// One service per concern; each calls main-process endpoints by contract.
// Components and state import services from here, so tests can mock this
// module (see test/mockServices).
export { parametersService } from './parametersService';
export type { Parameter, ParameterMetadata } from './parametersService';
export { kmsService } from './kmsService';
export { profilesService } from './profilesService';
export { settingsService } from './settingsService';
export { updatesService } from './updatesService';
export { filesService } from './filesService';
export { accountService } from './accountService';
export { menuService } from './menuService';
