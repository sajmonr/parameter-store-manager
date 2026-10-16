import { checkForRenderer } from '../../../updates';
import { defineEndpoint } from '../../endpoint';
import { checkForUpdatesContract } from './checkForUpdates.contract';

export default defineEndpoint(checkForUpdatesContract, () =>
  checkForRenderer()
);
