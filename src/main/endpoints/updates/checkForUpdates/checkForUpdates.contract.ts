import { z } from 'zod';
import { defineContract } from '../../../../shared/contract';

export type UpdateCheckResult =
  | { status: 'available'; version: string; url: string; instructions: string }
  // The notice was already shown in this process, e.g. before a reload.
  | { status: 'already-notified'; version: string }
  | { status: 'up-to-date'; version: string }
  | { status: 'error'; message: string }
  // Unpackaged builds don't check.
  | { status: 'skipped' };

export const checkForUpdatesContract = defineContract<UpdateCheckResult>()({
  channel: 'updates.check',
  request: z.void()
});
