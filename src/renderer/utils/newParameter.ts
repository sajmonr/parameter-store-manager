// The naming part of the new-parameter form. In structured mode the user
// picks a service and environments and types the key below them; in path
// mode they type the full path.
import type { Structure } from '../../shared/structure';
import {
  isEnvironmentLocation,
  isServiceLocation,
  pathFolderOf,
  serviceEnvironments
} from './location';
import type { Location, LocationContext } from './location';
import { folderOf, foldersOf, leafOf, rootFolder } from './paths';
import { parse, pathOf } from './structure';
import type { Match } from './structure';

// SSM limits standard-tier values to 4 KB.
export const MAX_VALUE_LENGTH = 4096;

export const isValueValid = (value: string) =>
  value.length > 0 && value.length <= MAX_VALUE_LENGTH;

export type NamingMode = 'structured' | 'path';

export interface Naming {
  mode: NamingMode;
  // Structured mode: '' when no service is configured.
  service: string;
  // The selected environments, in the configured order.
  envs: string[];
  key: string;
  // Path mode.
  path: string;
}

export const NAME_ERRORS = {
  spaces: 'spaces',
  // A character SSM doesn't allow in a name.
  characters: 'characters',
  // Structured mode: the key starts with the delimiter.
  leadingDelimiter: 'leadingDelimiter',
  // Path mode: the path doesn't start at the root.
  notRooted: 'notRooted',
  // An empty folder, from a doubled delimiter.
  emptySegment: 'emptySegment',
  // Nothing after the last delimiter. Shown only once the field loses focus,
  // since it's the normal state while drilling down into folders.
  noName: 'noName'
} as const;

export type NameError = (typeof NAME_ERRORS)[keyof typeof NAME_ERRORS];

// What SSM allows between delimiters.
const SEGMENT = /^[A-Za-z0-9_.-]+$/;

// Why the typed key or path can't name a parameter, or null when it can. An
// empty key has no error; it isn't ready either.
export const nameErrorOf = (
  text: string,
  mode: NamingMode,
  delimiter: string
): NameError | null => {
  if (/\s/.test(text)) return NAME_ERRORS.spaces;
  const segments = text.split(delimiter);
  if (segments.some(segment => segment && !SEGMENT.test(segment))) {
    return NAME_ERRORS.characters;
  }
  const root = rootFolder(delimiter);
  let rest = text;
  if (mode === 'structured') {
    if (text.startsWith(delimiter)) return NAME_ERRORS.leadingDelimiter;
  } else if (!text.startsWith(root)) {
    return NAME_ERRORS.notRooted;
  } else {
    rest = text.slice(root.length);
  }
  if (
    rest
      .split(delimiter)
      .slice(0, -1)
      .some(segment => !segment)
  ) {
    return NAME_ERRORS.emptySegment;
  }
  if (text && !leafOf(rest, delimiter)) return NAME_ERRORS.noName;
  return null;
};

// The service's environments in the configured order, or none when the
// service isn't configured.
export const environmentsOf = (service: string, structure: Structure) => {
  const configured = structure.services.find(s => s.segment === service);
  return configured ? serviceEnvironments(configured, structure) : [];
};

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

// The folder prefixes the typed text is completed against: the service's
// folder in each of its environments in structured mode, the root in path
// mode.
const basesOf = (naming: Naming, { structure, delimiter }: LocationContext) =>
  naming.mode === 'path'
    ? ['']
    : environmentsOf(naming.service, structure).map(env =>
        pathOf(env.segment, naming.service, '', structure, delimiter)
      );

export interface Suggestion {
  // The typed text up to the last delimiter.
  parent: string;
  // The child folder's name and delimiter.
  child: string;
}

export const MAX_SUGGESTIONS = 50;

// The existing child folders of the typed parent whose names start with the
// typed partial name, case-insensitively, sorted. In structured mode the
// folders under the service in any environment count.
export const suggestionsFor = (
  text: string,
  naming: Naming,
  folders: ReadonlySet<string>,
  ctx: LocationContext
): Suggestion[] => {
  const { delimiter } = ctx;
  const parent = folderOf(text, delimiter);
  const partial = leafOf(text, delimiter).toLowerCase();
  const children = new Set<string>();
  basesOf(naming, ctx).forEach(base => {
    const prefix = base + parent;
    folders.forEach(folder => {
      if (!folder.startsWith(prefix)) return;
      const child = folder.slice(prefix.length);
      const name = child.slice(0, -delimiter.length);
      if (
        name &&
        !name.includes(delimiter) &&
        name.toLowerCase().startsWith(partial) &&
        name.toLowerCase() !== partial
      ) {
        children.add(child);
      }
    });
  });
  return [...children]
    .sort((a, b) => a.localeCompare(b))
    .slice(0, MAX_SUGGESTIONS)
    .map(child => ({ parent, child }));
};

// The service's folder in each selected environment, or in each of its
// environments when none is selected; the root in path mode.
const targetBasesOf = (naming: Naming, ctx: LocationContext) => {
  const bases = basesOf(naming, ctx);
  if (naming.mode === 'path') return bases;
  const { structure, delimiter } = ctx;
  const selected = naming.envs.map(env =>
    pathOf(env, naming.service, '', structure, delimiter)
  );
  return bases.some(base => selected.includes(base))
    ? bases.filter(base => selected.includes(base))
    : bases;
};

// The folders of the typed text from the first one that's missing in any
// target: 'Workers/Pool/'. Empty when none are missing.
export const missingFolders = (
  text: string,
  naming: Naming,
  folders: ReadonlySet<string>,
  ctx: LocationContext
) => {
  const { delimiter } = ctx;
  const parent = folderOf(text, delimiter);
  const bases = targetBasesOf(naming, ctx);
  const chain = foldersOf(parent, delimiter);
  const index = chain.findIndex(folder =>
    bases.some(base => !folders.has(base + folder))
  );
  if (index < 0) return '';
  if (index > 0) return parent.slice(chain[index - 1]!.length);
  return naming.mode === 'path'
    ? parent.slice(rootFolder(delimiter).length)
    : parent;
};

// Every folder of the names.
export const folderSet = (names: Iterable<string>, delimiter: string) => {
  const folders = new Set<string>();
  for (const name of names) {
    foldersOf(name, delimiter).forEach(folder => folders.add(folder));
  }
  return folders;
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

// The form's start: the place the user is at, the duplicated parameter
// with 'Copy' after its name, or a `target` key in one environment.
export const initialNaming = (
  location: Location,
  ctx: LocationContext,
  source: string | null,
  target: { service: string; env: string; key: string } | null = null
): Naming => {
  const { structure, delimiter } = ctx;
  const services = structure.services;
  const withEnvs = services.find(s => s.environments.length);
  const fallback: Naming = {
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
  if (target) {
    return {
      mode: 'structured',
      service: target.service,
      envs: [target.env],
      key: target.key,
      path: pathOf(target.env, target.service, target.key, structure, delimiter)
    };
  }
  if (source !== null) {
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
  }
  if (!structure.enabled) return fallback;
  if (isServiceLocation(location) && location.service) {
    return {
      mode: 'structured',
      service: location.service,
      envs: location.env ? [location.env] : [],
      key: location.folder,
      path: fallback.path
    };
  }
  if (isEnvironmentLocation(location) && location.env) {
    const service =
      location.service ??
      services.find(s => s.environments.includes(location.env))?.segment;
    if (service) {
      return {
        mode: 'structured',
        service,
        envs: [location.env],
        key: location.folder,
        path: fallback.path
      };
    }
  }
  return fallback;
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
