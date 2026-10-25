// Compare mode: one service's keys side by side across its environments,
// with the keys whose values differ and the keys some environment lacks.
import type { StructureEnvironment } from '../../shared/structure';
import type { ParameterEntry } from '../state/parameters';
import { rowsFor, serviceEnvironments } from './location';
import type { LocationContext, ServiceLocation } from './location';
import { folderOf } from './paths';
import type { Matcher } from './search';
import { parse } from './structure';

export type CompareFilter = 'all' | 'differs' | 'missing';

export interface CompareKey {
  // The key below the service: 'AppServer/Port'.
  key: string;
  // The key's folder below the location's folder: 'AppServer/' or ''.
  folder: string;
  // The parameter with the key in each environment that has it.
  cells: ReadonlyMap<string, ParameterEntry>;
  // The environments without the key, in the configured order.
  missing: string[];
  // The environments whose value didn't load, such as a SecureString without
  // access to its KMS key. They are left out of `differs`.
  unreadable: string[];
  // The value or type isn't the same in every environment that has the key.
  differs: boolean;
}

export interface Comparison {
  // The service's environments, in the configured order: the columns.
  environments: StructureEnvironment[];
  // The keys under the folder that match the search, folder by folder with
  // the folder's own keys first.
  keys: CompareKey[];
  // Every key under the folder, ignoring the search.
  total: number;
  // The keys in `keys` with a value still loading. Until they arrive, the
  // Differs filter can't tell whether they differ.
  pending: number;
  // The keys each filter lists, from `keys`.
  counts: Record<CompareFilter, number>;
}

const isDiffering = (key: CompareKey) => key.differs;
const isMissing = (key: CompareKey) => key.missing.length > 0;

export const filterKeys = (keys: CompareKey[], filter: CompareFilter) => {
  if (filter === 'differs') return keys.filter(isDiffering);
  if (filter === 'missing') return keys.filter(isMissing);
  return keys;
};

const byFolderThenKey = (a: CompareKey, b: CompareKey) => {
  if (a.folder !== b.folder) return a.folder < b.folder ? -1 : 1;
  if (a.key === b.key) return 0;
  return a.key < b.key ? -1 : 1;
};

// The raw stored string and the type: nothing is normalised.
const valueId = ({ Type, Value }: ParameterEntry) =>
  JSON.stringify([Type, Value]);

// The keys of the service at `location` in each of its environments. A key
// is listed when the search matches its name in any environment. While
// values are `loading`, one not loaded yet is neither compared nor
// unreadable.
export const compare = (
  location: ServiceLocation,
  parameters: ParameterEntry[],
  matcher: Matcher,
  ctx: LocationContext,
  loading = false
): Comparison => {
  const { structure, delimiter } = ctx;
  const service = structure.services.find(s => s.segment === location.service);
  const environments = service ? serviceEnvironments(service, structure) : [];

  const cellsByKey = new Map<string, Map<string, ParameterEntry>>();
  environments.forEach(({ segment: env }) => {
    rowsFor({ ...location, env }, parameters, ctx).forEach(parameter => {
      const match = parse(parameter.Name, structure, delimiter);
      if (!match) return;
      let cells = cellsByKey.get(match.key);
      if (!cells) {
        cells = new Map();
        cellsByKey.set(match.key, cells);
      }
      cells.set(env, parameter);
    });
  });

  const keys = [...cellsByKey]
    .filter(([, cells]) => [...cells.values()].some(p => matcher.test(p.Name)))
    .map(([key, cells]): CompareKey => {
      const present = [...cells.values()];
      const loaded = present.filter(p => p.Value !== undefined);
      return {
        key,
        folder: folderOf(key, delimiter).slice(location.folder.length),
        cells,
        missing: environments
          .map(e => e.segment)
          .filter(env => !cells.has(env)),
        unreadable: loading
          ? []
          : [...cells].flatMap(([env, p]) =>
              p.Value === undefined ? [env] : []
            ),
        differs: new Set(loaded.map(valueId)).size > 1
      };
    })
    .sort(byFolderThenKey);

  return {
    environments,
    keys,
    total: cellsByKey.size,
    pending: loading
      ? keys.filter(k => [...k.cells.values()].some(p => p.Value === undefined))
          .length
      : 0,
    counts: {
      all: keys.length,
      differs: keys.filter(isDiffering).length,
      missing: keys.filter(isMissing).length
    }
  };
};

export interface CompareFolderRow {
  // The row key; keys can't contain brackets.
  id: string;
  folder: string;
  count: number;
}

// The keys, with a header row before each folder's below the location's.
export const compareRows = (keys: CompareKey[]) => {
  const rows: (CompareKey | CompareFolderRow)[] = [];
  const counts = new Map<string, number>();
  keys.forEach(({ folder }) =>
    counts.set(folder, (counts.get(folder) ?? 0) + 1)
  );
  let folder = '';
  keys.forEach(key => {
    if (key.folder && key.folder !== folder) {
      rows.push({
        id: JSON.stringify(['folder', key.folder]),
        folder: key.folder,
        count: counts.get(key.folder)!
      });
    }
    ({ folder } = key);
    rows.push(key);
  });
  return rows;
};

export const isFolderRow = (
  row: CompareKey | CompareFolderRow
): row is CompareFolderRow => 'id' in row;
