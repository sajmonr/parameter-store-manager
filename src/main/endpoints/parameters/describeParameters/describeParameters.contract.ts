import { z } from 'zod';
import { defineContract } from '../../../../shared/contract';
import type { ParameterMetadataDto } from '../parameter.contract';

export interface DescribeParametersResponse {
  parameters: ParameterMetadataDto[];
  // Set while there are more pages.
  nextToken?: string;
}

// One page of parameters, without their values. With `beginsWith`, only the
// names that start with it.
export const describeParametersContract =
  defineContract<DescribeParametersResponse>()({
    channel: 'parameters.describe',
    request: z.object({
      nextToken: z.string().optional(),
      beginsWith: z.string().min(1).max(1024).optional()
    })
  });
