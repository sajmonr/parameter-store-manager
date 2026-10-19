import { z } from 'zod';
import { THEMES } from '../../../../shared/availableSettings';
import type { Settings } from '../../../../shared/availableSettings';
import { defineContract } from '../../../../shared/contract';
import {
  isHexColor,
  LAYOUTS,
  PARAMETER_VIEWS,
  structureErrors
} from '../../../../shared/structure';

// The delimiter is another setting, so segments are checked against it when
// they are saved (see main/settings).
const structure = z
  .strictObject({
    enabled: z.boolean(),
    layout: z.enum(LAYOUTS),
    environments: z.array(
      z.strictObject({
        segment: z.string(),
        color: z.string().refine(isHexColor, 'Expected a #rrggbb color.')
      })
    ),
    services: z.array(
      z.strictObject({
        segment: z.string(),
        environments: z.array(z.string())
      })
    )
  })
  .superRefine((value, ctx) =>
    structureErrors(value, '').forEach(message =>
      ctx.addIssue({ code: 'custom', message })
    )
  );

// Saves the given settings and resolves to all of them. Unknown keys are
// rejected.
export const setSettingsContract = defineContract<Settings>()({
  channel: 'settings.set',
  request: z.strictObject({
    pathDelimiter: z.string().optional(),
    ssmRegion: z.string().optional(),
    kmsRegion: z.string().optional(),
    profile: z.string().optional(),
    theme: z.enum(THEMES).optional(),
    structure: structure.optional(),
    defaultView: z.enum(PARAMETER_VIEWS).optional()
  })
});
