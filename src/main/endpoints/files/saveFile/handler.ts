import { saveFile } from '../../../files';
import { defineEndpoint } from '../../endpoint';
import { saveFileContract } from './saveFile.contract';

export default defineEndpoint(
  saveFileContract,
  async ({ fileName, content }) => ({
    filePath: await saveFile(fileName, content)
  })
);
