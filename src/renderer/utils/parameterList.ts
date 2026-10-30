// The loaded parameters of a profile and region, and the pure changes made to
// them as pages, values, saves and deletes come in.
import type { PutParameterRequest } from '../../main/endpoints/parameters/putParameter/putParameter.contract';
import type { Parameter, ParameterMetadata } from '../services';
import { isSecureType } from '../../shared/parameterTypes';
import type { FetchErrorKind } from './awsErrors';

// The metadata from DescribeParameters, plus the value fields from
// GetParameters once they are loaded.
export type ParameterEntry = Omit<
  ParameterMetadata & Partial<Parameter>,
  'Name'
> & { Name: string };

export interface ParameterList {
  // A Map, not an object: a parameter may be named `__proto__` or `toString`.
  byName: ReadonlyMap<string, ParameterEntry>;
  // When the last load finished; null until the first one does.
  syncedAt: Date | null;
}

export const EMPTY_LIST: ParameterList = { byName: new Map(), syncedAt: null };

// Who a save made in the app is shown as, until the next load.
const APP_USER = 'Parameter Store Manager';

// What GetParameters adds to the metadata.
const valueFields = ({ Value, Selector, SourceResult }: ParameterEntry) => ({
  Value,
  Selector,
  SourceResult
});

export const withMetadata = (
  list: ParameterList,
  parameters: ParameterMetadata[],
  deleted: ReadonlySet<string>
): ParameterList => {
  const byName = new Map(list.byName);
  parameters.forEach(({ Name, ...rest }) => {
    if (!Name || deleted.has(Name)) return;
    // The new metadata replaces the old, so fields AWS no longer returns go
    // away. A refresh keeps the loaded value until the new one arrives.
    const previous = byName.get(Name);
    byName.set(Name, { ...(previous && valueFields(previous)), ...rest, Name });
  });
  return { ...list, byName };
};

export const withValues = (
  list: ParameterList,
  parameters: Parameter[]
): ParameterList => {
  const byName = new Map(list.byName);
  parameters.forEach(({ Name, ...rest }) => {
    const entry = Name ? byName.get(Name) : undefined;
    if (entry) byName.set(entry.Name, { ...entry, ...rest });
  });
  return { ...list, byName };
};

// The parameter as SSM would now return it, shown until the next load. An
// overwrite without a type or description keeps the old ones.
export const withPut = (
  list: ParameterList,
  { name, type, value, description, kmsKey }: PutParameterRequest,
  version: number | undefined
): ParameterList => {
  const byName = new Map(list.byName);
  const previous = byName.get(name);
  let keyId = previous?.KeyId;
  if (type) keyId = isSecureType(type) ? kmsKey : undefined;
  byName.set(name, {
    ...previous,
    Name: name,
    Type: type ?? previous?.Type,
    Value: value,
    Description: description ?? previous?.Description,
    KeyId: keyId,
    LastModifiedDate: new Date(),
    LastModifiedUser: APP_USER,
    Version: version || 1
  });
  return { ...list, byName };
};

export const without = (
  list: ParameterList,
  names: string[]
): ParameterList => {
  const byName = new Map(list.byName);
  names.forEach(name => byName.delete(name));
  return { ...list, byName };
};

// The list a finished load leaves: what it saw, plus what was created in the
// app while it ran, minus what was deleted in the app meanwhile. Parameters
// deleted outside the app since the last load drop out.
export const settleLoad = (
  list: ParameterList,
  seen: ReadonlySet<string>,
  {
    created,
    deleted
  }: { created: ReadonlySet<string>; deleted: ReadonlySet<string> }
): ParameterList => ({
  byName: new Map(
    [...list.byName].filter(
      ([name]) => (seen.has(name) || created.has(name)) && !deleted.has(name)
    )
  ),
  syncedAt: new Date()
});

// Sorting thousands of names is done once per list, not once per component.
const sortedCache = new WeakMap<ParameterList['byName'], ParameterEntry[]>();
export const sortedParameters = (byName: ParameterList['byName']) => {
  let sorted = sortedCache.get(byName);
  if (!sorted) {
    sorted = [...byName.keys()].sort().map(name => byName.get(name)!);
    sortedCache.set(byName, sorted);
  }
  return sorted;
};

export type LoadState =
  'loading' | 'ready' | 'empty' | 'error' | FetchErrorKind;

export interface FetchError {
  // Set when the error has its own screen (see utils/awsErrors).
  kind: FetchErrorKind | null;
  message: string;
}

// What the main area shows. Loaded data stays visible while a refresh runs
// or after a refresh fails with a generic error.
export const loadStateOf = ({
  fetchError,
  count,
  loaded
}: {
  fetchError: FetchError | null;
  count: number;
  // Whether a load has finished and none is running.
  loaded: boolean;
}): LoadState => {
  if (fetchError?.kind) return fetchError.kind;
  if (count) return 'ready';
  if (fetchError) return 'error';
  return loaded ? 'empty' : 'loading';
};
