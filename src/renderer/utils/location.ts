// Where the parameter list is: a folder in the Paths view, or a service,
// environment and folder (or a folder of Other paths) in the Services view.
// The Environments view is added later.
import type {
  ParameterView,
  Structure,
  StructureService
} from '../../shared/structure';
import { folderLabel, folderOf, foldersOf } from './paths';
import { parse, pathOf } from './structure';

export interface PathsLocation {
  view: 'paths';
  // Folder path ending in the delimiter; '' means all parameters.
  scope: string;
}

export interface ServiceLocation {
  view: 'services';
  // '' until validate picks one.
  service: string;
  // '' when the service has no environments, or until validate picks one.
  env: string;
  // A folder of the key: 'AppServer/' or '' for the whole service.
  folder: string;
}

export interface OtherLocation {
  view: 'services';
  other: true;
  // A full folder path, or '' for all of Other paths.
  folder: string;
}

export type Location = PathsLocation | ServiceLocation | OtherLocation;

export type LocationView = Location['view'];

export interface LocationContext {
  structure: Structure;
  delimiter: string;
}

export const isOtherLocation = (
  location: Location
): location is OtherLocation => 'other' in location;

export const isServiceLocation = (
  location: Location
): location is ServiceLocation =>
  location.view === 'services' && !isOtherLocation(location);

export const ALL_PARAMETERS: PathsLocation = { view: 'paths', scope: '' };

const OTHER_PATHS: OtherLocation = {
  view: 'services',
  other: true,
  folder: ''
};

// The service's environments, in the configured order.
export const serviceEnvironments = (
  service: StructureService,
  structure: Structure
) =>
  structure.environments.filter(e => service.environments.includes(e.segment));

// `preferred` if the service is in it, otherwise its first environment.
export const envFor = (
  service: StructureService,
  preferred: string | null,
  structure: Structure
) => {
  const envs = serviceEnvironments(service, structure).map(e => e.segment);
  return preferred && envs.includes(preferred) ? preferred : (envs[0] ?? '');
};

// Where `view` opens before the user has gone anywhere. The Environments view
// isn't there yet, so it opens on Services.
export const initialLocation = (view: ParameterView): Location =>
  view === 'paths'
    ? ALL_PARAMETERS
    : { view: 'services', service: '', env: '', folder: '' };

// Where the parameter `name` is listed in `view`.
export const locationOf = (
  name: string,
  view: LocationView,
  { structure, delimiter }: LocationContext
): Location => {
  if (view === 'paths') return { view, scope: folderOf(name, delimiter) };
  const match = parse(name, structure, delimiter);
  if (!match) {
    const folder = folderOf(name, delimiter);
    // A name at the root has no folder of its own.
    return {
      ...OTHER_PATHS,
      folder: foldersOf(folder, delimiter).length ? folder : ''
    };
  }
  return {
    view,
    service: match.service,
    env: match.env,
    folder: folderOf(match.key, delimiter)
  };
};

// The Services place a Paths folder points at. A folder above the service
// level keeps the environment or service it names; validate fills in the rest.
const fromScope = (scope: string, ctx: LocationContext): Location => {
  const { structure, delimiter } = ctx;
  const folders = foldersOf(scope, delimiter);
  if (!folders.length) return initialLocation('services');

  // A leaf under the folder tells parse where the folder is.
  const match = parse(`${scope}_`, structure, delimiter);
  if (match) {
    return {
      view: 'services',
      service: match.service,
      env: match.env,
      folder: folderOf(match.key, delimiter)
    };
  }
  if (folders.length === 1) {
    const segment = folderLabel(scope, delimiter);
    if (
      structure.layout === 'env-first' &&
      structure.environments.some(e => e.segment === segment)
    ) {
      return { view: 'services', service: '', env: segment, folder: '' };
    }
    if (
      structure.layout === 'svc-first' &&
      structure.services.some(s => s.segment === segment)
    ) {
      return { view: 'services', service: segment, env: '', folder: '' };
    }
  }
  return { ...OTHER_PATHS, folder: scope };
};

// The same place in another view.
export const convert = (
  location: Location,
  toView: LocationView,
  ctx: LocationContext
): Location => {
  if (location.view === toView) return location;
  if (location.view === 'paths') return fromScope(location.scope, ctx);
  if (isOtherLocation(location))
    return { view: 'paths', scope: location.folder };
  const { service, env, folder } = location;
  if (!service || !env) return ALL_PARAMETERS;
  return {
    view: 'paths',
    scope: pathOf(env, service, folder, ctx.structure, ctx.delimiter)
  };
};

// Whether the table at `location` lists the parameter `name`.
export const contains = (
  location: Location,
  name: string,
  { structure, delimiter }: LocationContext
) => {
  if (location.view === 'paths') return name.startsWith(location.scope);
  const match = parse(name, structure, delimiter);
  if (isOtherLocation(location)) {
    return !match && name.startsWith(location.folder);
  }
  return (
    !!match &&
    match.service === location.service &&
    match.env === location.env &&
    match.key.startsWith(location.folder)
  );
};

// The parameters the table at `location` shows, in the given order.
export const rowsFor = <T extends { Name: string }>(
  location: Location,
  parameters: T[],
  ctx: LocationContext
) =>
  location.view === 'paths' && !location.scope
    ? parameters
    : parameters.filter(p => contains(location, p.Name, ctx));

// The folder of `name` below the folder the table shows.
export const relativeFolder = (
  location: Location,
  name: string,
  { structure, delimiter }: LocationContext
) => {
  if (location.view === 'paths') {
    return folderOf(name, delimiter).slice(location.scope.length);
  }
  const match = isServiceLocation(location)
    ? parse(name, structure, delimiter)
    : null;
  return folderOf(match ? match.key : name, delimiter).slice(
    location.folder.length
  );
};

// The full folder of `location`, where a new parameter goes by default.
export const pathFolderOf = (location: Location, ctx: LocationContext) => {
  const converted = convert(location, 'paths', ctx);
  return converted.view === 'paths' ? converted.scope : '';
};

interface Preferences {
  defaultView: ParameterView;
  // The environment last picked in the Services view.
  lastEnv: string | null;
}

// `location` if it's still valid, otherwise the nearest place that is: Paths
// when the structure is off, another service when the service was removed,
// and another environment when the service isn't in it. Null is the default
// view's starting place.
export const validate = (
  location: Location | null,
  ctx: LocationContext,
  { defaultView, lastEnv }: Preferences
): Location => {
  const { structure } = ctx;
  if (!structure.enabled) {
    if (!location) return ALL_PARAMETERS;
    return convert(location, 'paths', ctx);
  }
  const current = location ?? initialLocation(defaultView);
  if (!isServiceLocation(current)) return current;

  const same = structure.services.find(s => s.segment === current.service);
  const service = same ?? structure.services[0];
  if (!service) return OTHER_PATHS;
  const env = envFor(service, current.env || lastEnv, structure);
  if (same && env === current.env) return current;
  return {
    view: 'services',
    service: service.segment,
    env,
    folder: same ? current.folder : ''
  };
};

// Sidebar tree keys. Segments may contain any character, so the parts are
// encoded as JSON.
export const serviceNodeKey = (service: string, folder = '') =>
  JSON.stringify(['service', service, folder]);

export const otherNodeKey = (folder = '') => JSON.stringify(['other', folder]);

// The tree node that shows `location`.
export const treeKeyOf = (location: Location) => {
  if (location.view === 'paths') return location.scope;
  if (isOtherLocation(location)) return otherNodeKey(location.folder);
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
  const { service } = location;
  return [
    serviceNodeKey(service),
    ...folders.map(f => serviceNodeKey(service, f))
  ];
};
