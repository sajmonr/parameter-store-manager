import { listProfiles } from '../../../awsProfiles';
import { isFakeSource } from '../../../source';
import { defineEndpoint } from '../../endpoint';
import { listProfilesContract } from './listProfiles.contract';
import type { ListProfilesResponse } from './listProfiles.contract';

// The fake source shows made-up profiles rather than the real ~/.aws ones;
// every profile reads the same fake data.
const FAKE_PROFILES: ListProfilesResponse = {
  profiles: [
    { name: 'default', source: 'config' },
    { name: 'fake-admin', source: 'credentials' }
  ],
  envProfile: null
};

export default defineEndpoint(listProfilesContract, () =>
  isFakeSource() ? FAKE_PROFILES : listProfiles()
);
