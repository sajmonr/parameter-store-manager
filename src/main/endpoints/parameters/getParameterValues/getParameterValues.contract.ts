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

// Parameters with their decrypted values.
export const getParameterValuesContract =
  defineContract<GetParameterValuesResponse>()({
    channel: 'parameters.getValues',
    request: z.object({
      names: z.array(z.string()).min(1).max(MAX_NAMES_PER_REQUEST)
    })
  });
