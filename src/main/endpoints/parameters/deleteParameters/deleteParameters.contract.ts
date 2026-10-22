import { z } from 'zod';
import { defineContract } from '../../../../shared/contract';

// SSM DeleteParameters accepts at most 10 names per call.
export const MAX_DELETES_PER_REQUEST = 10;

export interface DeleteParametersResponse {
  deleted: string[];
  // Names that weren't deleted, such as ones that don't exist (any more).
  invalid: string[];
}

export const deleteParametersContract =
  defineContract<DeleteParametersResponse>()({
    channel: 'parameters.delete',
    request: z.object({
      names: z.array(z.string().min(1)).min(1).max(MAX_DELETES_PER_REQUEST)
    })
  });
