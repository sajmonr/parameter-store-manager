import { z } from 'zod';
import type { Settings } from '../../../../shared/availableSettings';
import { defineContract } from '../../../../shared/contract';

export const getSettingsContract = defineContract<Settings>()({
  channel: 'settings.getAll',
  request: z.void()
});
