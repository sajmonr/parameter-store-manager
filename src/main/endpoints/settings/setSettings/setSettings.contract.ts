import { z } from 'zod';
import { THEMES } from '../../../../shared/availableSettings';
import type { Settings } from '../../../../shared/availableSettings';
import { defineContract } from '../../../../shared/contract';

// Saves the given settings and resolves to all of them. Unknown keys are
// rejected.
export const setSettingsContract = defineContract<Settings>()({
  channel: 'settings.set',
  request: z.strictObject({
    pathDelimiter: z.string().optional(),
    ssmRegion: z.string().optional(),
    kmsRegion: z.string().optional(),
    profile: z.string().optional(),
    theme: z.enum(THEMES).optional()
  })
});
