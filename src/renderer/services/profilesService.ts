import { listProfilesContract } from '../../main/endpoints/aws/listProfiles/listProfiles.contract';
import { call } from '../clients/call';

export const profilesService = {
  list: () => call(listProfilesContract)
};
