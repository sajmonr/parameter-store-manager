// Where the parameter list is: a folder in the Paths view, a service,
// environment and folder in the Services view, an environment (and maybe a
// service and folder) in the Environments view, or a folder of Other paths
// in either grouped view.
import type {
  ParameterView,
  Structure,
  StructureService
} from '../../shared/structure';
import { folderLabel, folderOf, foldersOf, rootFolder } from './paths';
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

export interface EnvironmentLocation {
  view: 'environments';
  // '' until validate picks one.
  env: string;
  // Null for the whole environment.
  service: string | null;
  // A folder of the key: 'AppServer/' or '' for the whole service. Always ''
  // for the whole environment.
  folder: string;
}

// The views that group by service and environment.
export type GroupedView = 'services' | 'environments';

export interface OtherLocation {
  view: GroupedView;
  other: true;
  // A full folder path, or '' for all of Other paths.
  folder: string;
}

export type Location =
  PathsLocation | ServiceLocation | EnvironmentLocation | OtherLocation;

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

export const isEnvironmentLocation = (
  location: Location
): location is EnvironmentLocation =>
  location.view === 'environments' && !isOtherLocation(location);

// The Environments view with no service picked: grouped by service.
export const isWholeEnvironment = (location: Location) =>
  isEnvironmentLocation(location) && location.service === null;

export const ALL_PARAMETERS: PathsLocation = { view: 'paths', scope: '' };

const otherPaths = (view: GroupedView, folder = ''): OtherLocation => ({
  view,
  other: true,
  folder
});

// A folder of a service's keys in an environment, in a grouped view. An
// empty service is none: the whole environment.
const placeIn = (
  view: GroupedView,
  env: string,
  service: string,
  folder: string
): Location =>
  view === 'services'
    ? { view, service, env, folder }
    : { view, env, service: service || null, folder: service ? folder : '' };

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

// Where `view` opens before the user has gone anywhere.
export const initialLocation = (view: ParameterView): Location => {
  if (view === 'paths') return ALL_PARAMETERS;
  return placeIn(view, '', '', '');
};

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
    return otherPaths(view, foldersOf(folder, delimiter).length ? folder : '');
  }
  return placeIn(
    view,
    match.env,
    match.service,
    folderOf(match.key, delimiter)
  );
};

// The place in a grouped view a Paths folder points at. A folder above the
// service level keeps the environment or service it names; validate fills in
// the rest.
const fromScope = (
  scope: string,
  view: GroupedView,
  ctx: LocationContext
): Location => {
  const { structure, delimiter } = ctx;
  const folders = foldersOf(scope, delimiter);
  if (!folders.length) return initialLocation(view);

  // A leaf under the folder tells parse where the folder is.
  const match = parse(`${scope}_`, structure, delimiter);
  if (match) {
    return placeIn(
      view,
      match.env,
      match.service,
      folderOf(match.key, delimiter)
    );
  }
  if (folders.length === 1) {
    const segment = folderLabel(scope, delimiter);
    if (
      structure.layout === 'env-first' &&
      structure.environments.some(e => e.segment === segment)
    ) {
      return placeIn(view, segment, '', '');
    }
    if (
      structure.layout === 'svc-first' &&
      structure.services.some(s => s.segment === segment)
    ) {
      return placeIn(view, '', segment, '');
    }
  }
  return otherPaths(view, scope);
};

// The Paths folder of a place in a grouped view. Without both an environment
// and a service, only the first segment of the layout is a folder.
const scopeOf = (
  env: string,
  service: string | null,
  folder: string,
  { structure, delimiter }: LocationContext
) => {
  if (env && service) {
    return pathOf(env, service, folder, structure, delimiter);
  }
  const first = structure.layout === 'env-first' ? env : service;
  return first ? `${rootFolder(delimiter)}${first}${delimiter}` : '';
};

// The full folder of `location`: the Paths view's scope there, and where a
// new parameter goes by default.
export const pathFolderOf = (location: Location, ctx: LocationContext) => {
  if (location.view === 'paths') return location.scope;
  if (isOtherLocation(location)) return location.folder;
  const { env, service, folder } = location;
  return scopeOf(env, service, folder, ctx);
};

// The same place in another view.
export const convert = (
  location: Location,
  toView: LocationView,
  ctx: LocationContext
): Location => {
  if (location.view === toView) return location;
  if (toView === 'paths') {
    return { view: 'paths', scope: pathFolderOf(location, ctx) };
  }
  if (location.view === 'paths') return fromScope(location.scope, toView, ctx);
  if (isOtherLocation(location)) return otherPaths(toView, location.folder);
  const { env, service, folder } = location;
  return placeIn(toView, env, service ?? '', folder);
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
  if (!match || match.env !== location.env) return false;
  if (isWholeEnvironment(location)) return true;
  return (
    match.service === location.service && match.key.startsWith(location.folder)
  );
};

const byKey = (a: { key: string }, b: { key: string }) => {
  if (a.key === b.key) return 0;
  return a.key < b.key ? -1 : 1;
};

// The parameters of an environment by service, in the configured service
// order, each service's sorted by key. Names that don't parse are left out.
export const groupByService = <T extends { Name: string }>(
  parameters: T[],
  { structure, delimiter }: LocationContext
) => {
  const groups = new Map(
    structure.services.map(s => [
      s.segment,
      [] as { key: string; parameter: T }[]
    ])
  );
  parameters.forEach(parameter => {
    const match = parse(parameter.Name, structure, delimiter);
    if (match) groups.get(match.service)?.push({ key: match.key, parameter });
  });
  return [...groups]
    .filter(([, rows]) => rows.length)
    .map(([service, rows]) => ({
      service,
      parameters: rows.sort(byKey).map(row => row.parameter)
    }));
};

// The parameters the table at `location` shows, in the given order; a whole
// environment's grouped by service.
export const rowsFor = <T extends { Name: string }>(
  location: Location,
  parameters: T[],
  ctx: LocationContext
) => {
  if (location.view === 'paths' && !location.scope) return parameters;
  const rows = parameters.filter(p => contains(location, p.Name, ctx));
  if (!isWholeEnvironment(location)) return rows;
  return groupByService(rows, ctx).flatMap(group => group.parameters);
};

// The folder of `name` below the folder the table shows.
export const relativeFolder = (
  location: Location,
  name: string,
  { structure, delimiter }: LocationContext
) => {
  if (location.view === 'paths') {
    return folderOf(name, delimiter).slice(location.scope.length);
  }
  const match = isOtherLocation(location)
    ? null
    : parse(name, structure, delimiter);
  return folderOf(match ? match.key : name, delimiter).slice(
    location.folder.length
  );
};

// Where to list `name`, the same key in another environment of the service,
// from `location` in the same view: `location` if it lists the name already,
// otherwise the same place in that environment when that lists it, otherwise
// the name's own place.
export const locationInEnv = (
  location: Location,
  name: string,
  ctx: LocationContext
): Location => {
  if (contains(location, name, ctx)) return location;
  const match = parse(name, ctx.structure, ctx.delimiter);
  const grouped =
    location.view === 'paths' ? convert(location, 'services', ctx) : location;
  if (match && (isServiceLocation(grouped) || isEnvironmentLocation(grouped))) {
    const moved = convert({ ...grouped, env: match.env }, location.view, ctx);
    if (contains(moved, name, ctx)) return moved;
  }
  return locationOf(name, location.view, ctx);
};

interface Preferences {
  defaultView: ParameterView;
  // The environment last picked in a grouped view.
  lastEnv: string | null;
}

// Another service when the service was removed, preferring one in the
// environment shown; another environment when the service isn't in it.
const validService = (
  current: ServiceLocation,
  { structure }: LocationContext,
  lastEnv: string | null
): Location => {
  const preferredEnv = current.env || lastEnv;
  const same = structure.services.find(s => s.segment === current.service);
  const service =
    same ??
    structure.services.find(
      s => !!preferredEnv && s.environments.includes(preferredEnv)
    ) ??
    structure.services[0];
  if (!service) return otherPaths('services');
  const env = envFor(service, preferredEnv, structure);
  if (same && env === current.env) return current;
  return {
    view: 'services',
    service: service.segment,
    env,
    folder: same ? current.folder : ''
  };
};

// The whole environment when the service was removed or isn't in it.
// Without an environment, one the service is in, otherwise the whole last or
// first environment.
const validEnvironment = (
  current: EnvironmentLocation,
  { structure }: LocationContext,
  lastEnv: string | null
): Location => {
  const { environments, services } = structure;
  const service = services.find(s => s.segment === current.service);
  if (environments.some(e => e.segment === current.env)) {
    if (!current.service || service?.environments.includes(current.env)) {
      return current;
    }
    return { ...current, service: null, folder: '' };
  }
  const env = service && envFor(service, lastEnv, structure);
  if (env) return { ...current, env };
  const fallback =
    environments.find(e => e.segment === lastEnv) ?? environments[0];
  if (!fallback) return otherPaths('environments');
  return placeIn('environments', fallback.segment, '', '');
};

// `location` if it's still valid, otherwise the nearest place that is: Paths
// when the structure is off, another service or environment when it was
// removed. Null is the default view's starting place.
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
  if (isServiceLocation(current)) return validService(current, ctx, lastEnv);
  if (isEnvironmentLocation(current)) {
    return validEnvironment(current, ctx, lastEnv);
  }
  return current;
};

// Sidebar tree keys. Segments may contain any character, so the parts are
// encoded as JSON.
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
