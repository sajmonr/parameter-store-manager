import { z } from 'zod';
import { defineContract } from '../../../../shared/contract';
import type { DataSource } from '../../../../shared/source';

export interface GetSourceResponse {
  source: DataSource;
}

// Whether parameters come from AWS or the fake development dataset.
export const getSourceContract = defineContract<GetSourceResponse>()({
  channel: 'app.getSource',
  request: z.void()
});
