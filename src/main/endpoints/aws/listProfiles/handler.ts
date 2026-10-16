import { listProfiles } from '../../../awsProfiles';
import { defineEndpoint } from '../../endpoint';
import { listProfilesContract } from './listProfiles.contract';

export default defineEndpoint(listProfilesContract, () => listProfiles());
