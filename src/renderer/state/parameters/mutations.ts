// Saves and deletes. Each shows its change in the loaded list right away and
// records it, so a load running meanwhile doesn't undo it.
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { QueryClient } from '@tanstack/react-query';
import pAll from 'p-all';
import type { PutParameterRequest } from '../../../main/endpoints/parameters/putParameter/putParameter.contract';
import { MAX_DELETES_PER_REQUEST } from '../../../main/endpoints/parameters/deleteParameters/deleteParameters.contract';
import type { ApiError } from '../../clients/call';
import { parametersService } from '../../services';
import { chunk, retryWithBackoff, settleEach } from '../../utils/batch';
import { withPut, without } from '../../utils/parameterList';
import type { ParameterList } from '../../utils/parameterList';
import { recordChange } from './changes';
import { currentKey } from './key';

// Parallel writes when creating or copying to several names, and parallel
// delete batches. Low, since SSM's write limit is shared per account.
const WRITE_CONCURRENCY = 5;
const DELETE_CONCURRENCY = 2;

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
    mutationFn: async (
      requests: PutParameterRequest[]
    ): Promise<CreateResult> => {
      const { done, failed } = await settleEach(requests, {
        nameOf: request => request.name,
        task: request => putParameter(client, request),
        concurrency: WRITE_CONCURRENCY
      });
      return { created: done, failed };
    }
  });
};

export interface CopyResult {
  copied: string[];
  // Each name that wasn't saved, with why.
  failed: Map<string, string>;
}

// Saves one value to other parameters, 5 at a time. A failed one doesn't
// stop the others; `onDone` runs as each finishes either way. The SDK
// already backs off while SSM throttles; when it gives up, the save is
// tried again.
export const useCopyValue = () => {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async ({
      requests,
      onDone
    }: {
      requests: PutParameterRequest[];
      onDone?: () => void;
    }): Promise<CopyResult> => {
      const { done, failed } = await settleEach(requests, {
        nameOf: request => request.name,
        task: request => retryWithBackoff(() => putParameter(client, request)),
        concurrency: WRITE_CONCURRENCY,
        onSettled: onDone
      });
      return { copied: done, failed };
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
        { concurrency: DELETE_CONCURRENCY }
      );
      return result;
    }
  });
};
