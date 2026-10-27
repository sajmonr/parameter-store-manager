import { z } from 'zod';
import type { ParameterTier } from '@aws-sdk/client-ssm';
import { defineContract } from '../../../../shared/contract';

// The types the app can save; StringList parameters are shown but not edited.
export const PARAMETER_TYPES = ['String', 'SecureString'] as const;
export type EditableParameterType = (typeof PARAMETER_TYPES)[number];

// The key SSM encrypts a SecureString with when none is given.
export const DEFAULT_KMS_KEY = 'alias/aws/ssm';

export const isEditableType = (type: unknown): type is EditableParameterType =>
  (PARAMETER_TYPES as readonly unknown[]).includes(type);

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
