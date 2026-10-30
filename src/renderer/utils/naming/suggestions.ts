// Completing the typed key or path against the folders that exist.
import type { LocationContext } from '../location';
import { folderOf, foldersOf, leafOf, rootFolder } from '../paths';
import { environmentsOf, pathOf } from '../structure';
import { compareLocale } from '../../../shared/sort';
import type { Naming } from './types';

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
    .sort(compareLocale)
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
