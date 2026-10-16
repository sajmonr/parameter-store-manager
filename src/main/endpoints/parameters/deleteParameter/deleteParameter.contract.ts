import { z } from 'zod';
import { defineContract } from '../../../../shared/contract';

export const deleteParameterContract = defineContract<{ name: string }>()({
  channel: 'parameters.delete',
  request: z.object({ name: z.string().min(1) })
});
