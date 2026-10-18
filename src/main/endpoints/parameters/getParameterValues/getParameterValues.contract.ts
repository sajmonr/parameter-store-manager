import { z } from 'zod';
import { defineContract } from '../../../../shared/contract';
import type { ParameterDto } from '../parameter.contract';

// SSM GetParameters accepts at most 10 names per call.
export const MAX_NAMES_PER_REQUEST = 10;

export interface GetParameterValuesResponse {
  parameters: ParameterDto[];
  // Names that don't exist (any more).
  invalidParameters: string[];
}

// Parameters with their values. Without `withDecryption`, SecureString values
// stay encrypted and no KMS access is needed.
export const getParameterValuesContract =
  defineContract<GetParameterValuesResponse>()({
    channel: 'parameters.getValues',
    request: z.object({
      names: z.array(z.string()).min(1).max(MAX_NAMES_PER_REQUEST),
      withDecryption: z.boolean().default(true)
    })
  });
