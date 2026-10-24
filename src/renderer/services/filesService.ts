import { saveFileContract } from '../../main/endpoints/files/saveFile/saveFile.contract';
import { call } from '../clients/call';

export const filesService = {
  // Resolves to the saved path, or null when the user cancelled.
  save: async (fileName: string, content: string) =>
    (await call(saveFileContract, { fileName, content })).filePath
};
