import { z } from 'zod';
import { defineContract } from '../../../../shared/contract';

export interface SaveFileResponse {
  // null when the user cancelled the save dialog.
  filePath: string | null;
}

// Saves an export where the user picks in a save dialog. `fileName` is only
// the suggested name, so it can't contain a path; its extension says which
// kind of file it is.
export const saveFileContract = defineContract<SaveFileResponse>()({
  channel: 'files.save',
  request: z.object({
    fileName: z
      .string()
      .max(255)
      .regex(/^[^/\\]+\.(csv|json)$/),
    content: z.string()
  })
});
