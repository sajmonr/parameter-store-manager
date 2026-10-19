// Reads a service, an environment and a key out of parameter names, as the
// structure setting describes them. A name that doesn't fit is listed under
// Other paths.
import type { Structure } from '../../shared/structure';
import { rootFolder } from './paths';

export interface Match {
  env: string;
  service: string;
  // The rest of the name, which may contain folders: 'AppServer/Dashboard/Title'.
  key: string;
}

// The environment and service a name points at, or null when they aren't
// both configured. Doesn't check that the service is in that environment.
// Only the root folder may be empty, so the name can be rebuilt exactly.
const split = (
  name: string,
  { layout, environments, services }: Structure,
  delimiter: string
) => {
  const root = rootFolder(delimiter);
  if (!delimiter || !name.startsWith(root)) return null;
  const segments = name.slice(root.length).split(delimiter);
  if (segments.length < 3 || segments.includes('')) return null;

  const [first, second] = segments as [string, string];
  const [env, service] =
    layout === 'env-first' ? [first, second] : [second, first];
  const configured = services.find(s => s.segment === service);
  if (!configured || !environments.some(e => e.segment === env)) return null;
  return {
    match: { env, service, key: segments.slice(2).join(delimiter) },
    enabled: configured.environments.includes(env)
  };
};

// Where a name sits in the structure, or null for Other paths: when the
// structure is off, the name is too short, the environment or service isn't
// configured, or the service isn't in that environment.
export const parse = (
  name: string,
  structure: Structure,
  delimiter: string
): Match | null => {
  if (!structure.enabled) return null;
  const found = split(name, structure, delimiter);
  return found?.enabled ? found.match : null;
};

// The name of `key` in that service and environment; the inverse of parse.
// A folder key ('AppServer/' or '') gives that folder's path.
export const pathOf = (
  env: string,
  service: string,
  key: string,
  { layout }: Structure,
  delimiter: string
) => {
  const [first, second] =
    layout === 'env-first' ? [env, service] : [service, env];
  return `${rootFolder(delimiter)}${first}${delimiter}${second}${delimiter}${key}`;
};

// Counts per environment, then per service.
type CountsByEnv = ReadonlyMap<string, number>;

export interface StructuredNames {
  // The match of every name that has one.
  matches: ReadonlyMap<string, Match>;
  // The names under Other paths, in the given order.
  other: string[];
  byEnv: CountsByEnv;
  byService: ReadonlyMap<string, number>;
  // Service → environment → count.
  byServiceEnv: ReadonlyMap<string, CountsByEnv>;
  // Names at a configured service and environment whose combination isn't
  // checked, so they are under Other paths. Service → environment → count.
  inOther: ReadonlyMap<string, CountsByEnv>;
}

const increment = <K>(counts: Map<K, number>, key: K) =>
  counts.set(key, (counts.get(key) ?? 0) + 1);

const incrementCell = (
  counts: Map<string, Map<string, number>>,
  service: string,
  env: string
) => {
  let row = counts.get(service);
  if (!row) {
    row = new Map();
    counts.set(service, row);
  }
  increment(row, env);
};

// Matches and counts for `names` in one pass. With the structure off, every
// name is under Other paths.
export const structureNames = (
  names: readonly string[],
  structure: Structure,
  delimiter: string
): StructuredNames => {
  const matches = new Map<string, Match>();
  const other: string[] = [];
  const byEnv = new Map<string, number>();
  const byService = new Map<string, number>();
  const byServiceEnv = new Map<string, Map<string, number>>();
  const inOther = new Map<string, Map<string, number>>();

  names.forEach(name => {
    const found = structure.enabled ? split(name, structure, delimiter) : null;
    if (!found?.enabled) {
      other.push(name);
      if (found) incrementCell(inOther, found.match.service, found.match.env);
      return;
    }
    const { match } = found;
    matches.set(name, match);
    increment(byEnv, match.env);
    increment(byService, match.service);
    incrementCell(byServiceEnv, match.service, match.env);
  });

  return { matches, other, byEnv, byService, byServiceEnv, inOther };
};

// A count from byServiceEnv or inOther; 0 when there are none.
export const countAt = (
  counts: StructuredNames['byServiceEnv'],
  service: string,
  env: string
) => counts.get(service)?.get(env) ?? 0;
