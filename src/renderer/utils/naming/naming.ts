// The naming part of the new-parameter form. In structured mode the user
// picks a service and environments and types the key below them; in path
// mode they type the full path.
import type { Structure } from '../../../shared/structure';
import {
  isEnvironmentLocation,
  isServiceLocation,
  pathFolderOf
} from '../location';
import type { Location, LocationContext } from '../location';
import { leafOf, rootFolder } from '../paths';
import { environmentsOf, parse, pathOf } from '../structure';
import type { Match } from '../structure';
import type { Naming } from './types';

// The full names the form creates, in the configured environment order.
export const targetsOf = (
  naming: Naming,
  { structure, delimiter }: LocationContext
) => {
  if (naming.mode === 'path') return [naming.path];
  return environmentsOf(naming.service, structure)
    .filter(env => naming.envs.includes(env.segment))
    .map(env =>
      pathOf(env.segment, naming.service, naming.key, structure, delimiter)
    );
};

// Where a path or a folder sits in the structure. A folder ('/development/
// compass/AppServer/') gives its folder key ('AppServer/').
export const matchFolderOrName = (
  text: string,
  { structure, delimiter }: LocationContext
): Match | null => {
  if (!text.endsWith(delimiter)) return parse(text, structure, delimiter);
  const match = parse(`${text}_`, structure, delimiter);
  return match && { ...match, key: match.key.slice(0, -1) };
};

// The full path of the key in the first selected environment, for switching
// to path mode.
export const toPath = (naming: Naming, ctx: LocationContext): Naming => {
  const { structure, delimiter } = ctx;
  const envs = environmentsOf(naming.service, structure);
  const env =
    envs.find(e => naming.envs.includes(e.segment)) ?? envs[0] ?? null;
  const path = env
    ? pathOf(env.segment, naming.service, naming.key, structure, delimiter)
    : rootFolder(delimiter) + naming.key;
  return { ...naming, mode: 'path', path };
};

// The service, environment and key of the typed path when it fits the
// structure; otherwise the current ones, with the path's last segment as the
// key.
export const toStructured = (naming: Naming, ctx: LocationContext): Naming => {
  const match = matchFolderOrName(naming.path, ctx);
  if (match) {
    return {
      ...naming,
      mode: 'structured',
      service: match.service,
      envs: [match.env],
      key: match.key
    };
  }
  return {
    ...naming,
    mode: 'structured',
    key: leafOf(naming.path, ctx.delimiter)
  };
};

// Where a new name goes when the form opens on a location: the service or
// environment shown, in structured mode. Null when the location names no
// service.
const namingAt = (
  location: Location,
  { structure }: LocationContext,
  path: string
): Naming | null => {
  if (!structure.enabled) return null;
  if (isServiceLocation(location) && location.service) {
    return {
      mode: 'structured',
      service: location.service,
      envs: location.env ? [location.env] : [],
      key: location.folder,
      path
    };
  }
  if (isEnvironmentLocation(location) && location.env) {
    const service =
      location.service ??
      structure.services.find(s => s.environments.includes(location.env))
        ?.segment;
    if (service) {
      return {
        mode: 'structured',
        service,
        envs: [location.env],
        key: location.folder,
        path
      };
    }
  }
  return null;
};

// A duplicate of `source`: its name with 'Copy' added, in structured mode
// when it fits the structure and a grouped view is shown.
const copyNaming = (
  source: string,
  location: Location,
  { structure, delimiter }: LocationContext,
  fallback: Naming
): Naming => {
  const copy = `${source}Copy`;
  const match = parse(source, structure, delimiter);
  if (match && location.view !== 'paths') {
    return {
      mode: 'structured',
      service: match.service,
      envs: [match.env],
      key: `${match.key}Copy`,
      path: copy
    };
  }
  return { ...fallback, path: copy };
};

// Path mode at the location's folder, with the first service that has
// environments picked for a switch to structured mode.
const pathNaming = (location: Location, ctx: LocationContext): Naming => {
  const { structure, delimiter } = ctx;
  const withEnvs = structure.services.find(s => s.environments.length);
  return {
    mode: 'path',
    service: withEnvs?.segment ?? '',
    envs: withEnvs
      ? environmentsOf(withEnvs.segment, structure)
          .slice(0, 1)
          .map(e => e.segment)
      : [],
    key: '',
    path: pathFolderOf(location, ctx) || rootFolder(delimiter)
  };
};

// The form's start: a `target` key in one environment, the duplicated
// parameter with 'Copy' after its name, or the place the user is at.
export const initialNaming = (
  location: Location,
  ctx: LocationContext,
  source: string | null,
  target: { service: string; env: string; key: string } | null = null
): Naming => {
  const { structure, delimiter } = ctx;
  if (target) {
    return {
      mode: 'structured',
      service: target.service,
      envs: [target.env],
      key: target.key,
      path: pathOf(target.env, target.service, target.key, structure, delimiter)
    };
  }
  const fallback = pathNaming(location, ctx);
  if (source !== null) return copyNaming(source, location, ctx, fallback);
  return namingAt(location, ctx, fallback.path) ?? fallback;
};

// The environments the service keeps when switching to it: the selected ones
// it also has, or else its first.
export const envsForService = (
  service: string,
  selected: string[],
  structure: Structure
) => {
  const envs = environmentsOf(service, structure).map(e => e.segment);
  const kept = envs.filter(env => selected.includes(env));
  return kept.length ? kept : envs.slice(0, 1);
};
