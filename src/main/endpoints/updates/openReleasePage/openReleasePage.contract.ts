import { z } from 'zod';
import { defineContract } from '../../../../shared/contract';

// Opens the page of the release the last check found. Takes no URL: what to
// open is decided in the main process.
export const openReleasePageContract = defineContract<void>()({
  channel: 'updates.openReleasePage',
  request: z.void()
});
