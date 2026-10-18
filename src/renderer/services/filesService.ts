import { saveCsvContract } from '../../main/endpoints/files/saveCsv/saveCsv.contract';
import { call } from '../clients/call';

export const filesService = {
  // Resolves to the saved path, or null when the user cancelled.
  saveCsv: async (fileName: string, content: string) =>
    (await call(saveCsvContract, { fileName, content })).filePath
};
