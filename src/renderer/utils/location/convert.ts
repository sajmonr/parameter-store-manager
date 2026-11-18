// Moving between views, and the place a parameter is listed.
import type { ParameterView } from '../../../shared/structure';
import { folderLabel, folderOf, foldersOf, rootFolder } from '../paths';
import { findEnvironment, findService, parse, pathOf } from '../structure';
import { ALL_PARAMETERS, isOtherLocation, otherPaths, placeIn } from './types';
import type {
  GroupedView,
  Location,
  LocationContext,
  LocationView
} from './types';

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
      findEnvironment(structure, segment)
    ) {
      return placeIn(view, segment, '', '');
    }
    if (structure.layout === 'svc-first' && findService(structure, segment)) {
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
