import { z } from 'zod';
import type { ParameterTier } from '@aws-sdk/client-ssm';
import { defineContract } from '../../../../shared/contract';

// The types the app can save; StringList parameters are shown but not edited.
export const PARAMETER_TYPES = ['String', 'SecureString'] as const;
export type EditableParameterType = (typeof PARAMETER_TYPES)[number];

export const isEditableType = (type: unknown): type is EditableParameterType =>
  (PARAMETER_TYPES as readonly unknown[]).includes(type);

export interface PutParameterResponse {
  version?: number;
  tier?: ParameterTier;
}

// Creates a parameter, or with `overwrite` saves a new version of one.
export const putParameterContract = defineContract<PutParameterResponse>()({
  channel: 'parameters.put',
  request: z.object({
    name: z.string().min(1),
    type: z.enum(PARAMETER_TYPES),
    value: z.string(),
    description: z.string().optional(),
    // Used for SecureString only.
    kmsKey: z.string().optional(),
    overwrite: z.boolean().default(false)
  })
});

export type PutParameterRequest = z.input<typeof putParameterContract.request>;
