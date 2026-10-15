// The parameters of the current profile and region, loaded with TanStack
// Query. A load streams its pages and values into the query cache, so the
// table fills in while it runs.
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { QueryFunctionContext } from '@tanstack/react-query';
import pAll from 'p-all';
import type { PutParameterRequest } from '../../shared/ipc';
import * as api from '../clients/api';
import type { Parameter, ParameterMetadata } from '../clients/api';
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
  byName: Record<string, ParameterEntry>;
  // When the last load finished; null until the first one does.
  syncedAt: Date | null;
}

const EMPTY_LIST: ParameterList = { byName: {}, syncedAt: null };

export const parametersKey = (profile: string, region: string) =>
  ['parameters', profile, region] as const;

type ParametersKey = ReturnType<typeof parametersKey>;

const currentKey = () => {
  const { profile, ssmRegion } = getSettings();
  return parametersKey(profile, ssmRegion);
};

// AWS limits GetParameters to 10 names per call.
const VALUES_BATCH_SIZE = 10;

const chunk = <T>(items: T[], size: number) => {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
};

// Each load gets a number; only the latest load may change the cache, so a
// load for an old profile or region can't overwrite a newer one.
let latestLoad = 0;

// Names created or deleted in the app while a load runs. The loaded list is
// older than these changes, so they are applied on top of it.
let changesDuringLoad = {
  created: new Set<string>(),
  deleted: new Set<string>()
};

const withMetadata = (
  list: ParameterList,
  parameters: ParameterMetadata[]
): ParameterList => {
  const byName = { ...list.byName };
  parameters.forEach(({ Name, ...rest }) => {
    if (!Name || changesDuringLoad.deleted.has(Name)) return;
    // A refresh keeps the loaded value until the new one arrives.
    byName[Name] = { ...byName[Name], ...rest, Name };
  });
  return { ...list, byName };
};

const withValues = (
  list: ParameterList,
  parameters: Parameter[]
): ParameterList => {
  const byName = { ...list.byName };
  parameters.forEach(({ Name, ...rest }) => {
    const entry = Name && byName[Name];
    if (entry) byName[entry.Name] = { ...entry, ...rest };
  });
  return { ...list, byName };
};

type Update = (change: (list: ParameterList) => ParameterList) => void;

const loadValues = (names: string[], update: Update) =>
  pAll(
    chunk(names, VALUES_BATCH_SIZE).map(batch => async () => {
      try {
        const { parameters } = await api.getParameters(batch);
        update(list => withValues(list, parameters));
      } catch (error) {
        console.error('Something went wrong while fetching parameters', error);
      }
    }),
    { concurrency: 2 }
  );

const notifyLoadError = (error: unknown) => {
  // Expired sessions and denied access get their own screen instead.
  if (classifyFetchError(error as api.ApiError)) return;
  feedback.notification?.error({
    message:
      'Parameters were not loaded. Check your AWS Connections (~/.aws/credentials, STSKey, or environment variables)',
    description: describeError(error as api.ApiError)
  });
};

const loadParameters = async ({
  client,
  queryKey,
  signal
}: QueryFunctionContext<ParametersKey>): Promise<ParameterList> => {
  latestLoad += 1;
  const load = latestLoad;
  changesDuringLoad = { created: new Set(), deleted: new Set() };
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
      const page = await api.describeParameters(nextToken);
      if (!isCurrent()) return cached();

      const names = page.parameters.flatMap(p => (p.Name ? [p.Name] : []));
      names.forEach(name => seen.add(name));
      update(list => withMetadata(list, page.parameters));
      valueLoads.push(loadValues(names, update));

      ({ nextToken } = page);
    } while (nextToken);
  } catch (error) {
    if (isCurrent()) notifyLoadError(error);
    throw error;
  }

  await Promise.all(valueLoads);
  if (!isCurrent()) return cached();

  // Drops parameters deleted outside the app since the last load, but keeps
  // the ones created in the app while this load ran.
  const { created, deleted } = changesDuringLoad;
  const byName = Object.fromEntries(
    Object.entries(cached().byName).filter(
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
    sorted = Object.keys(byName)
      .sort()
      .map(name => byName[name]!);
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
): ParameterList => ({
  ...list,
  byName: {
    ...list.byName,
    [name]: {
      ...list.byName[name],
      Name: name,
      Type: type,
      Value: value,
      Description: description,
      KeyId: type === 'SecureString' ? kmsKey : undefined,
      LastModifiedDate: new Date(),
      LastModifiedUser: 'Parameter Store Manager',
      Version: version || 1
    }
  }
});

const without = (list: ParameterList, name: string): ParameterList => {
  const byName = { ...list.byName };
  delete byName[name];
  return { ...list, byName };
};

// Creates a parameter, or with `overwrite` saves a new version of one.
export const usePutParameter = () => {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (request: PutParameterRequest) => {
      const key = currentKey();
      const result = await api.putParameter(request);
      changesDuringLoad.created.add(request.name);
      changesDuringLoad.deleted.delete(request.name);
      client.setQueryData<ParameterList>(
        key,
        list => list && withPut(list, request, result.version)
      );
      return result;
    }
  });
};

export const useDeleteParameter = () => {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (name: string) => {
      const key = currentKey();
      const result = await api.deleteParameter(name);
      changesDuringLoad.deleted.add(name);
      changesDuringLoad.created.delete(name);
      client.setQueryData<ParameterList>(
        key,
        list => list && without(list, name)
      );
      return result;
    }
  });
};
