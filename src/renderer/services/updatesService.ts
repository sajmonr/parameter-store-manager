import { checkForUpdatesContract } from '../../main/endpoints/updates/checkForUpdates/checkForUpdates.contract';
import { openReleasePageContract } from '../../main/endpoints/updates/openReleasePage/openReleasePage.contract';
import { call } from '../clients/call';

export const updatesService = {
  check: () => call(checkForUpdatesContract),
  openReleasePage: () => call(openReleasePageContract)
};
