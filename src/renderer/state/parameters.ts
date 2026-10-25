// The parameters of the current profile and region, loaded with TanStack
// Query. A load streams its pages and values into the query cache, so the
// table fills in while it runs.
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { QueryClient, QueryFunctionContext } from '@tanstack/react-query';
import pAll from 'p-all';
import type { PutParameterRequest } from '../../main/endpoints/parameters/putParameter/putParameter.contract';
import { MAX_DELETES_PER_REQUEST } from '../../main/endpoints/parameters/deleteParameters/deleteParameters.contract';
import type { ApiError } from '../clients/call';
import { parametersService } from '../services';
import type { Parameter, ParameterMetadata } from '../services';
import { feedback } from '../feedback';
import { classifyFetchError, describeError } from '../utils/awsErrors';
import type { FetchErrorKind } from '../utils/awsErrors';
import { getSettings, useSettingsStore } from './settings';

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

const EMPTY_LIST: ParameterList = { byName: new Map(), syncedAt: null };

export const parametersKey = (profile: string, region: string) =>
  ['parameters', profile, region] as const;

type ParametersKey = ReturnType<typeof parametersKey>;

const keyId = (key: ParametersKey) => JSON.stringify(key);

const currentKey = () => {
  const { profile, ssmRegion } = getSettings();
  return parametersKey(profile, ssmRegion);
};

// AWS limits GetParameters to 10 names per call.
export const VALUES_BATCH_SIZE = 10;

export const chunk = <T>(items: T[], size: number) => {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
};

// Each load gets a number; only the latest load may change the cache, so a
// load for an old profile or region can't overwrite a newer one.
let latestLoad = 0;

// Names created or deleted in the app while a load runs, per profile and
// region. The loaded list is older than these changes, so they are applied on
// top of it.
interface Changes {
  created: Set<string>;
  deleted: Set<string>;
}
const changesDuringLoad = new Map<string, Changes>();

const recordChange = (
  key: ParametersKey,
  name: string,
  change: 'created' | 'deleted'
) => {
  const changes = changesDuringLoad.get(keyId(key));
  if (!changes) return;
  changes[change].add(name);
  changes[change === 'created' ? 'deleted' : 'created'].delete(name);
};

// What GetParameters adds to the metadata.
const valueFields = ({ Value, Selector, SourceResult }: ParameterEntry) => ({
  Value,
  Selector,
  SourceResult
});

const withMetadata = (
  list: ParameterList,
  parameters: ParameterMetadata[],
  deleted: Set<string>
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

const withValues = (
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

type Update = (change: (list: ParameterList) => ParameterList) => void;

const loadValues = (names: string[], update: Update) =>
  pAll(
    chunk(names, VALUES_BATCH_SIZE).map(batch => async () => {
      try {
        const { parameters } = await parametersService.getValues(batch);
        update(list => withValues(list, parameters));
      } catch (error) {
        console.error('Something went wrong while fetching parameters', error);
      }
    }),
    { concurrency: 2 }
  );

const notifyLoadError = (error: unknown) => {
  // Expired sessions and denied access get their own screen instead.
  if (classifyFetchError(error as ApiError)) return;
  feedback.notification?.error({
    title:
      'Parameters were not loaded. Check your AWS Connections (~/.aws/credentials, STSKey, or environment variables)',
    description: describeError(error as ApiError)
  });
};

const loadParameters = async ({
  client,
  queryKey,
  signal
}: QueryFunctionContext<ParametersKey>): Promise<ParameterList> => {
  latestLoad += 1;
  const load = latestLoad;
  const changes: Changes = { created: new Set(), deleted: new Set() };
  changesDuringLoad.set(keyId(queryKey), changes);
  const isCurrent = () => load === latestLoad && !signal.aborted;
  const cached = () =>
    client.getQueryData<ParameterList>(queryKey) ?? EMPTY_LIST;
  const update: Update = change => {
    if (isCurrent()) {
      client.setQueryData<ParameterList>(queryKey, list =>
        change(list ?? EMPTY_LIST)
      );
    }
  };

  const seen = new Set<string>();
  const valueLoads: Promise<unknown>[] = [];
  let nextToken: string | undefined;

  try {
    do {
      // Pages are loaded one after another so the table fills in progressively.
      const page = await parametersService.describe(nextToken);
      if (!isCurrent()) return cached();

      const names = page.parameters.flatMap(p => (p.Name ? [p.Name] : []));
      names.forEach(name => seen.add(name));
      update(list => withMetadata(list, page.parameters, changes.deleted));
      valueLoads.push(loadValues(names, update));

      ({ nextToken } = page);
    } while (nextToken);
  } catch (error) {
    // Value batches of earlier pages may still be running. Writing to the
    // cache marks the query successful and would clear this error, so they
    // finish first.
    await Promise.all(valueLoads);
    if (isCurrent()) notifyLoadError(error);
    throw error;
  }

  await Promise.all(valueLoads);
  if (!isCurrent()) return cached();

  // Drops parameters deleted outside the app since the last load, but keeps
  // the ones created in the app while this load ran.
  const { created, deleted } = changes;
  const byName = new Map(
    [...cached().byName].filter(
      ([name]) => (seen.has(name) || created.has(name)) && !deleted.has(name)
    )
  );
  return { byName, syncedAt: new Date() };
};

// Sorting thousands of names is done once per list, not once per component.
const sortedCache = new WeakMap<ParameterList['byName'], ParameterEntry[]>();
const sortedParameters = (byName: ParameterList['byName']) => {
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

const useParameterQuery = () => {
  const profile = useSettingsStore(settings => settings.profile);
  const region = useSettingsStore(settings => settings.ssmRegion);
  return useQuery({
    queryKey: parametersKey(profile, region),
    queryFn: loadParameters,
    // Switching back to a profile or region loads it from scratch.
    gcTime: 0,
    structuralSharing: false
  });
};

export const useParameters = () => {
  const query = useParameterQuery();
  const list = query.data ?? EMPTY_LIST;
  const parameters = sortedParameters(list.byName);
  const loading = query.isFetching;

  // An error is cleared as soon as a new load starts.
  const fetchError: FetchError | null =
    query.error && !loading
      ? {
          kind: classifyFetchError(query.error),
          message: describeError(query.error)
        }
      : null;

  // What the main area shows. Loaded data stays visible while a refresh runs
  // or after a refresh fails with a generic error.
  let loadState: LoadState;
  if (fetchError?.kind) loadState = fetchError.kind;
  else if (parameters.length) loadState = 'ready';
  else if (fetchError) loadState = 'error';
  else loadState = query.isSuccess && !loading ? 'empty' : 'loading';

  return {
    // Sorted by name.
    parameters,
    byName: list.byName,
    syncedAt: list.syncedAt,
    loading,
    fetchError,
    loadState,
    refresh: () => query.refetch()
  };
};

// The parameter as SSM would now return it, shown until the next load.
const withPut = (
  list: ParameterList,
  { name, type, value, description, kmsKey }: PutParameterRequest,
  version: number | undefined
): ParameterList => {
  const byName = new Map(list.byName);
  byName.set(name, {
    ...byName.get(name),
    Name: name,
    Type: type,
    Value: value,
    Description: description,
    KeyId: type === 'SecureString' ? kmsKey : undefined,
    LastModifiedDate: new Date(),
    LastModifiedUser: 'Parameter Store Manager',
    Version: version || 1
  });
  return { ...list, byName };
};

const without = (list: ParameterList, names: string[]): ParameterList => {
  const byName = new Map(list.byName);
  names.forEach(name => byName.delete(name));
  return { ...list, byName };
};

// Creates a parameter, or with `overwrite` saves a new version of one, and
// shows it in the loaded list. Every save in the app goes through here.
export const putParameter = async (
  client: QueryClient,
  request: PutParameterRequest
) => {
  const key = currentKey();
  const result = await parametersService.put(request);
  recordChange(key, request.name, 'created');
  client.setQueryData<ParameterList>(
    key,
    list => list && withPut(list, request, result.version)
  );
  return result;
};

// Loads the current profile and region again, for code outside components.
export const refreshParameters = (client: QueryClient) =>
  client.refetchQueries({ queryKey: currentKey() });

export const usePutParameter = () => {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (request: PutParameterRequest) => putParameter(client, request)
  });
};

export interface CreateResult {
  created: string[];
  // Each name that wasn't created, with why.
  failed: Map<string, string>;
}

// Creates the parameters, 5 at a time. A failed one doesn't stop the others.
export const useCreateParameters = () => {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (requests: PutParameterRequest[]) => {
      const result: CreateResult = { created: [], failed: new Map() };
      await pAll(
        requests.map(request => async () => {
          try {
            await putParameter(client, request);
            result.created.push(request.name);
          } catch (error) {
            result.failed.set(request.name, describeError(error as ApiError));
          }
        }),
        { concurrency: 5 }
      );
      return result;
    }
  });
};

export interface DeleteResult {
  deleted: string[];
  // Names SSM didn't delete, or that were in a call that failed.
  failed: string[];
  // The first call that failed, if one did.
  error: ApiError | null;
}

// Deletes the parameters, 10 per call. A failed call doesn't stop the
// others; what it held is reported as failed.
export const useDeleteParameters = () => {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (names: string[]): Promise<DeleteResult> => {
      const key = currentKey();
      const result: DeleteResult = { deleted: [], failed: [], error: null };
      await pAll(
        chunk(names, MAX_DELETES_PER_REQUEST).map(batch => async () => {
          try {
            const { deleted, invalid } = await parametersService.delete(batch);
            deleted.forEach(name => recordChange(key, name, 'deleted'));
            client.setQueryData<ParameterList>(
              key,
              list => list && without(list, deleted)
            );
            result.deleted.push(...deleted);
            result.failed.push(...invalid);
          } catch (error) {
            result.failed.push(...batch);
            result.error ??= error as ApiError;
          }
        }),
        { concurrency: 2 }
      );
      return result;
    }
  });
};
