// What the table at a location lists.
import { folderOf } from '../paths';
import { parse } from '../structure';
import { byString } from '../../../shared/sort';
import { convert, locationOf } from './convert';
import {
  isEnvironmentLocation,
  isOtherLocation,
  isServiceLocation,
  isWholeEnvironment
} from './types';
import type { Location, LocationContext } from './types';

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

const byKey = byString((row: { key: string }) => row.key);

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

// Whether the main area lists `name` at `location`. Comparing, it lists the
// service's keys in each of its environments, not only the location's.
export const mainAreaLists = (
  location: Location,
  name: string,
  ctx: LocationContext,
  comparing: boolean
) => {
  if (comparing && isServiceLocation(location)) {
    const match = parse(name, ctx.structure, ctx.delimiter);
    return !!match && contains({ ...location, env: match.env }, name, ctx);
  }
  return contains(location, name, ctx);
};
