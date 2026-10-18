import { saveCsvFile } from '../../../files';
import { defineEndpoint } from '../../endpoint';
import { saveCsvContract } from './saveCsv.contract';

export default defineEndpoint(
  saveCsvContract,
  async ({ fileName, content }) => ({
    filePath: await saveCsvFile(fileName, content)
  })
);
