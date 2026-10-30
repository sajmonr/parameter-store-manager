// The grouped views' sidebars. Services: each service with the folders of
// its keys. Environments: each environment with its services and their
// folders. Both end with Other paths and its folders.
import { buildFolderTree, foldersOf } from './paths';
import type { FolderNode } from './paths';
import { envFor } from './structure';
import { environmentNodeKey, otherNodeKey, serviceNodeKey } from './location';
import type { GroupedView, Location, LocationContext } from './location';
import { parse } from './structure';
import { OTHER_PATHS_ROOT_LABEL } from './labels';

export interface SidebarNode {
  key: string;
  label: string;
  count: number;
  kind: 'environment' | 'service' | 'other' | 'folder';
  // An environment's colour.
  color?: string;
  // Where selecting the node goes. A service node's environment is a
  // preference; validate settles it.
  location: Location;
  children: SidebarNode[];
}

export interface ServicesTree {
  services: SidebarNode[];
  // Null when searching finds nothing there.
  other: SidebarNode | null;
  // Every node with children, for expanding all of them.
  keys: string[];
}

const countFolders = (keys: string[], delimiter: string) => {
  const counts = new Map<string, number>();
  keys.forEach(key =>
    foldersOf(key, delimiter).forEach(folder =>
      counts.set(folder, (counts.get(folder) ?? 0) + 1)
    )
  );
  return counts;
};

const toNodes = (
  folders: FolderNode[],
  toNode: (folder: FolderNode, children: SidebarNode[]) => SidebarNode
): SidebarNode[] =>
  folders.map(folder => toNode(folder, toNodes(folder.children, toNode)));

// Makes nodes, keeping the keys of those with children.
const nodeMaker = () => {
  const expandable: string[] = [];
  const node = (
    fields: Omit<SidebarNode, 'children'>,
    children: SidebarNode[]
  ): SidebarNode => {
    if (children.length) expandable.push(fields.key);
    return { ...fields, children };
  };
  return { expandable, node };
};

type MakeNode = ReturnType<typeof nodeMaker>['node'];

// The folder nodes of `keys`, nested as their folders are. `fieldsOf` gives
// each folder's key, count and location.
const folderNodes = (
  keys: string[],
  delimiter: string,
  node: MakeNode,
  fieldsOf: (
    folder: FolderNode
  ) => Pick<SidebarNode, 'key' | 'count' | 'location'>
) =>
  toNodes(buildFolderTree(keys, delimiter).roots, (folder, nested) =>
    node({ ...fieldsOf(folder), label: folder.label, kind: 'folder' }, nested)
  );

// Other paths with the folders of `names`. Null while searching finds
// nothing there.
const otherPathsNode = (
  names: string[],
  view: GroupedView,
  { delimiter }: LocationContext,
  searching: boolean,
  node: MakeNode
) => {
  if (searching && !names.length) return null;
  const children = folderNodes(names, delimiter, node, folder => ({
    key: otherNodeKey(folder.key),
    count: folder.count,
    location: { view, other: true, folder: folder.key }
  }));
  return node(
    {
      key: otherNodeKey(),
      label: OTHER_PATHS_ROOT_LABEL,
      count: names.length,
      kind: 'other',
      location: { view, other: true, folder: '' }
    },
    children
  );
};

interface ServiceKeys {
  // The keys in every environment, for the folders.
  all: string[];
  // The keys in the environment the service is counted in.
  inEnv: string[];
}

// The keys of each service, and the names under Other paths. `envs` is the
// environment each service is counted in.
const bucketByService = (
  names: readonly string[],
  { structure, delimiter }: LocationContext,
  envs: ReadonlyMap<string, string>
) => {
  const keys = new Map<string, ServiceKeys>(
    structure.services.map(s => [s.segment, { all: [], inEnv: [] }])
  );
  const other: string[] = [];
  names.forEach(name => {
    const match = parse(name, structure, delimiter);
    const service = match && keys.get(match.service);
    if (!match || !service) {
      other.push(name);
      return;
    }
    service.all.push(match.key);
    if (match.env === envs.get(match.service)) service.inEnv.push(match.key);
  });
  return { keys, other };
};

// A service in the Services view, counted in `env`.
const serviceNode = (
  service: string,
  env: string,
  { all, inEnv }: ServiceKeys,
  delimiter: string,
  node: MakeNode
) => {
  const counts = countFolders(inEnv, delimiter);
  const location = (folder: string): Location => ({
    view: 'services',
    service,
    env,
    folder
  });
  const children = folderNodes(all, delimiter, node, folder => ({
    key: serviceNodeKey(service, folder.key),
    count: counts.get(folder.key) ?? 0,
    location: location(folder.key)
  }));
  return node(
    {
      key: serviceNodeKey(service),
      label: service,
      count: inEnv.length,
      kind: 'service',
      location: location('')
    },
    children
  );
};

// `names` are the parameters that match the search. A service and its
// folders are counted in the environment they show: `active`'s for the
// selected service, and for the others the one they would open on,
// `preferredEnv` if they're in it. Folders come from the keys in all its
// environments. While searching, services and Other paths without matches
// are left out.
export const buildServicesTree = (
  names: readonly string[],
  ctx: LocationContext,
  preferredEnv: string | null,
  searching: boolean,
  active: { service: string; env: string } | null = null
): ServicesTree => {
  const { structure, delimiter } = ctx;
  const envs = new Map(
    structure.services.map(s => [
      s.segment,
      s.segment === active?.service
        ? active.env
        : envFor(s, preferredEnv, structure)
    ])
  );
  const { keys, other } = bucketByService(names, ctx, envs);

  const { expandable, node } = nodeMaker();
  const services = structure.services.flatMap(({ segment }) => {
    const serviceKeys = keys.get(segment)!;
    if (searching && !serviceKeys.all.length) return [];
    return [
      serviceNode(segment, envs.get(segment)!, serviceKeys, delimiter, node)
    ];
  });

  const otherNode = otherPathsNode(other, 'services', ctx, searching, node);
  return { services, other: otherNode, keys: expandable };
};

export interface EnvironmentsTree {
  environments: SidebarNode[];
  // Null when searching finds nothing there.
  other: SidebarNode | null;
  // Every node with children, for expanding all of them.
  keys: string[];
}

// The keys of each service in each environment it is in (environment →
// service → keys), and the names under Other paths.
const bucketByEnvironment = (
  names: readonly string[],
  { structure, delimiter }: LocationContext
) => {
  const keys = new Map(
    structure.environments.map(e => [
      e.segment,
      new Map(
        structure.services
          .filter(s => s.environments.includes(e.segment))
          .map(s => [s.segment, [] as string[]])
      )
    ])
  );
  const other: string[] = [];
  names.forEach(name => {
    const match = parse(name, structure, delimiter);
    const serviceKeys = match && keys.get(match.env)?.get(match.service);
    if (!match || !serviceKeys) other.push(name);
    else serviceKeys.push(match.key);
  });
  return { keys, other };
};

// An environment in the Environments view, with its services. Null while
// searching finds nothing in it.
const environmentNode = (
  { segment: env, color }: { segment: string; color: string },
  serviceKeys: ReadonlyMap<string, string[]>,
  delimiter: string,
  searching: boolean,
  node: MakeNode
) => {
  const services = [...serviceKeys].flatMap(([service, keys]) => {
    if (searching && !keys.length) return [];
    const children = folderNodes(keys, delimiter, node, folder => ({
      key: environmentNodeKey(env, service, folder.key),
      count: folder.count,
      location: { view: 'environments', env, service, folder: folder.key }
    }));
    return [
      node(
        {
          key: environmentNodeKey(env, service),
          label: service,
          count: keys.length,
          kind: 'service',
          location: { view: 'environments', env, service, folder: '' }
        },
        children
      )
    ];
  });
  const count = services.reduce((sum, s) => sum + s.count, 0);
  if (searching && !count) return null;
  return node(
    {
      key: environmentNodeKey(env),
      label: env,
      count,
      kind: 'environment',
      color,
      location: { view: 'environments', env, service: null, folder: '' }
    },
    services
  );
};

// `names` are the parameters that match the search. Each environment lists
// the services that are in it, in the configured order. While searching,
// environments, services and Other paths without matches are left out.
export const buildEnvironmentsTree = (
  names: readonly string[],
  ctx: LocationContext,
  searching: boolean
): EnvironmentsTree => {
  const { structure, delimiter } = ctx;
  const { keys, other } = bucketByEnvironment(names, ctx);

  const { expandable, node } = nodeMaker();
  const environments = structure.environments.flatMap(environment => {
    const env = environmentNode(
      environment,
      keys.get(environment.segment)!,
      delimiter,
      searching,
      node
    );
    return env ? [env] : [];
  });

  const otherNode = otherPathsNode(other, 'environments', ctx, searching, node);
  return { environments, other: otherNode, keys: expandable };
};
