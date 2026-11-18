// Sidebar tree keys. Segments may contain any character, so the parts are
// encoded as JSON.
import { foldersOf } from '../paths';
import { isEnvironmentLocation, isOtherLocation } from './types';
import type { Location, LocationContext } from './types';

export const serviceNodeKey = (service: string, folder = '') =>
  JSON.stringify(['service', service, folder]);

export const environmentNodeKey = (
  env: string,
  service: string | null = null,
  folder = ''
) => JSON.stringify(['environment', env, service, folder]);

export const otherNodeKey = (folder = '') => JSON.stringify(['other', folder]);

// The tree node that shows `location`.
export const treeKeyOf = (location: Location) => {
  if (location.view === 'paths') return location.scope;
  if (isOtherLocation(location)) return otherNodeKey(location.folder);
  if (isEnvironmentLocation(location)) {
    return environmentNodeKey(location.env, location.service, location.folder);
  }
  return serviceNodeKey(location.service, location.folder);
};

// The tree nodes to expand to show `location`, outermost first.
export const treeKeysTo = (
  location: Location,
  { delimiter }: LocationContext
) => {
  if (location.view === 'paths') return foldersOf(location.scope, delimiter);
  const folders = foldersOf(location.folder, delimiter);
  if (isOtherLocation(location)) {
    return [otherNodeKey(), ...folders.map(f => otherNodeKey(f))];
  }
  if (isEnvironmentLocation(location)) {
    const { env, service } = location;
    if (!service) return [environmentNodeKey(env)];
    return [
      environmentNodeKey(env),
      environmentNodeKey(env, service),
      ...folders.map(f => environmentNodeKey(env, service, f))
    ];
  }
  const { service } = location;
  return [
    serviceNodeKey(service),
    ...folders.map(f => serviceNodeKey(service, f))
  ];
};
