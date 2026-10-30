import { z } from 'zod';
import type { ParameterTier } from '@aws-sdk/client-ssm';
import { defineContract } from '../../../../shared/contract';
import { PARAMETER_TYPES } from '../../../../shared/parameterTypes';

export interface PutParameterResponse {
  version?: number;
  tier?: ParameterTier;
}

// Creates a parameter, or with `overwrite` saves a new version of one. An
// overwrite without a type or description keeps the parameter's own.
export const putParameterContract = defineContract<PutParameterResponse>()({
  channel: 'parameters.put',
  request: z
    .object({
      name: z.string().min(1),
      type: z.enum(PARAMETER_TYPES).optional(),
      value: z.string(),
      description: z.string().optional(),
      // Used for SecureString only.
      kmsKey: z.string().optional(),
      overwrite: z.boolean().default(false)
    })
    .refine(request => request.overwrite || request.type, {
      message: 'A new parameter needs a type.',
      path: ['type']
    })
});

export type PutParameterRequest = z.input<typeof putParameterContract.request>;
