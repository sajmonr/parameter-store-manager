import { z } from 'zod';
import { defineContract } from '../../../../shared/contract';
import type { ParameterMetadataDto } from '../parameter.contract';

export interface DescribeParametersResponse {
  parameters: ParameterMetadataDto[];
  // Set while there are more pages.
  nextToken?: string;
}

// One page of parameters, without their values.
export const describeParametersContract =
  defineContract<DescribeParametersResponse>()({
    channel: 'parameters.describe',
    request: z.object({ nextToken: z.string().optional() })
  });
