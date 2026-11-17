// The parameters of the current profile and region, loaded with TanStack
// Query. A load streams its pages and values into the query cache, so the
// table fills in while it runs.
import { useQuery } from '@tanstack/react-query';
import type { QueryClient, QueryFunctionContext } from '@tanstack/react-query';
import type { ApiError } from '../../clients/call';
import { classifyFetchError, describeError } from '../../utils/awsErrors';
import {
  EMPTY_LIST,
  loadStateOf,
  settleLoad,
  sortedParameters,
  withMetadata,
  withValues
} from '../../utils/parameterList';
import type { FetchError, ParameterList } from '../../utils/parameterList';
import { useSettingsStore } from '../settings';
import { describeAllPages, readValueBatches } from '../ssmReads';
import { trackChanges } from './changes';
import { currentKey, parametersKey } from './key';
import type { ParametersKey } from './key';
import { NO_PROGRESS, useLoadProgress } from './loadProgress';
import type { LoadProgress } from '../../utils/progress';
import { notifyError } from '../../utils/notify';

// Each load gets a number; only the latest load may change the cache, so a
// load for an old profile or region can't overwrite a newer one.
let latestLoad = 0;

type Update = (change: (list: ParameterList) => ParameterList) => void;

// Thrown by a queued value call of a load that is no longer current, so it
// isn't sent.
class StaleLoad extends Error {}

// The batches of every page share the SSM read limit, so overlapping pages
// can't add up to more calls than it allows.
const loadValues = (
  names: string[],
  update: Update,
  isCurrent: () => boolean,
  onBatchDone: (size: number) => void
) => {
  const check = () => {
    if (!isCurrent()) throw new StaleLoad();
  };
  return Promise.all(
    readValueBatches(names, { decrypt: true, check }).map(
      async ({ batch, values }) => {
        try {
          const { parameters } = await values;
          update(list => withValues(list, parameters));
        } catch (error) {
          if (error instanceof StaleLoad) return;
          console.error(
            'Something went wrong while fetching parameters',
            error
          );
        } finally {
          onBatchDone(batch.length);
        }
      }
    )
  );
};

const notifyLoadError = (error: unknown) => {
  // Expired sessions and denied access get their own screen instead.
  if (classifyFetchError(error as ApiError)) return;
  notifyError(
    'Parameters were not loaded. Check your AWS Connections (~/.aws/credentials, STSKey, or environment variables)',
    error
  );
};

const loadParameters = async ({
  client,
  queryKey,
  signal
}: QueryFunctionContext<ParametersKey>): Promise<ParameterList> => {
  latestLoad += 1;
  const load = latestLoad;
  const changes = trackChanges(queryKey);
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
  const progress = (
    change: (current: LoadProgress) => Partial<LoadProgress>
  ) => {
    if (isCurrent()) useLoadProgress.setState(change);
  };
  useLoadProgress.setState(NO_PROGRESS, true);
  const onBatchDone = (size: number) =>
    progress(({ valuesDone }) => ({ valuesDone: valuesDone + size }));

  const seen = new Set<string>();
  const valueLoads: Promise<unknown>[] = [];

  try {
    // Pages are loaded one after another so the table fills in progressively.
    const complete = await describeAllPages(parameters => {
      if (!isCurrent()) return false;
      const names = parameters.flatMap(p => (p.Name ? [p.Name] : []));
      names.forEach(name => seen.add(name));
      update(list => withMetadata(list, parameters, changes.deleted));
      progress(() => ({ found: seen.size }));
      valueLoads.push(loadValues(names, update, isCurrent, onBatchDone));
    });
    if (!complete) return cached();
    progress(() => ({ listed: true }));
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
  return settleLoad(cached(), seen, changes);
};

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

  return {
    // Sorted by name.
    parameters,
    byName: list.byName,
    syncedAt: list.syncedAt,
    loading,
    fetchError,
    loadState: loadStateOf({
      fetchError,
      count: parameters.length,
      loaded: query.isSuccess && !loading
    }),
    refresh: () => query.refetch()
  };
};

// Loads the current profile and region again, for code outside components.
export const refreshParameters = (client: QueryClient) =>
  client.refetchQueries({ queryKey: currentKey() });
