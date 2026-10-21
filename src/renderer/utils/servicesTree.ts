// The Services view's sidebar: each service with the folders of its keys,
// then Other paths with its folders.
import { buildFolderTree, foldersOf } from './paths';
import type { FolderNode } from './paths';
import { envFor, otherNodeKey, serviceNodeKey } from './location';
import type { Location, LocationContext } from './location';
import { parse } from './structure';

export interface SidebarNode {
  key: string;
  label: string;
  count: number;
  kind: 'service' | 'other' | 'folder';
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

// `names` are the parameters that match the search. A service and its
// folders are counted in the environment it would open on: `preferredEnv`
// if it's in it. Folders come from the keys in all its environments. While
// searching, services and Other paths without matches are left out.
export const buildServicesTree = (
  names: readonly string[],
  ctx: LocationContext,
  preferredEnv: string | null,
  searching: boolean
): ServicesTree => {
  const { structure, delimiter } = ctx;
  const envs = new Map(
    structure.services.map(s => [s.segment, envFor(s, preferredEnv, structure)])
  );
  const keys = new Map<string, { all: string[]; inEnv: string[] }>(
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

  const expandable: string[] = [];
  const node = (
    fields: Omit<SidebarNode, 'children'>,
    children: SidebarNode[]
  ) => {
    if (children.length) expandable.push(fields.key);
    return { ...fields, children };
  };

  const services = structure.services.flatMap(({ segment }) => {
    const { all, inEnv } = keys.get(segment)!;
    if (searching && !all.length) return [];
    const env = envs.get(segment)!;
    const counts = countFolders(inEnv, delimiter);
    const location = (folder: string): Location => ({
      view: 'services',
      service: segment,
      env,
      folder
    });
    const children = toNodes(
      buildFolderTree(all, delimiter).roots,
      (folder, nested) =>
        node(
          {
            key: serviceNodeKey(segment, folder.key),
            label: folder.label,
            count: counts.get(folder.key) ?? 0,
            kind: 'folder',
            location: location(folder.key)
          },
          nested
        )
    );
    return [
      node(
        {
          key: serviceNodeKey(segment),
          label: segment,
          count: inEnv.length,
          kind: 'service',
          location: location('')
        },
        children
      )
    ];
  });

  let otherNode: SidebarNode | null = null;
  if (!searching || other.length) {
    const children = toNodes(
      buildFolderTree(other, delimiter).roots,
      (folder, nested) =>
        node(
          {
            key: otherNodeKey(folder.key),
            label: folder.label,
            count: folder.count,
            kind: 'folder',
            location: { view: 'services', other: true, folder: folder.key }
          },
          nested
        )
    );
    otherNode = node(
      {
        key: otherNodeKey(),
        label: 'Other paths',
        count: other.length,
        kind: 'other',
        location: { view: 'services', other: true, folder: '' }
      },
      children
    );
  }

  return { services, other: otherNode, keys: expandable };
};
