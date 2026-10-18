import { z } from 'zod';
import { defineContract } from '../../../../shared/contract';

export interface SaveCsvResponse {
  // null when the user cancelled the save dialog.
  filePath: string | null;
}

// Saves a CSV where the user picks in a save dialog. `fileName` is only the
// suggested name, so it can't contain a path.
export const saveCsvContract = defineContract<SaveCsvResponse>()({
  channel: 'files.saveCsv',
  request: z.object({
    fileName: z
      .string()
      .max(255)
      .regex(/^[^/\\]+\.csv$/),
    content: z.string()
  })
});
