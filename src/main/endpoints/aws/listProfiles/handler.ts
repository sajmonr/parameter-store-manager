import { listProfiles } from '../../../awsProfiles';
import { isFakeSource } from '../../../source';
import { defineEndpoint } from '../../endpoint';
import { listProfilesContract } from './listProfiles.contract';
import type { ListProfilesResponse } from './listProfiles.contract';
import { DEFAULT_PROFILE_NAME } from '../../../../shared/aws';

// The fake source shows made-up profiles rather than the real ~/.aws ones;
// every profile reads the same fake data.
const FAKE_PROFILES: ListProfilesResponse = {
  profiles: [
    { name: DEFAULT_PROFILE_NAME, source: 'config' },
    { name: 'fake-admin', source: 'credentials' }
  ],
  envProfile: null
};

export default defineEndpoint(listProfilesContract, () =>
  isFakeSource() ? FAKE_PROFILES : listProfiles()
);
