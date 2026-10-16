import { z } from 'zod';
import { defineContract } from '../../../../shared/contract';

export interface AwsProfile {
  name: string;
  source: 'config' | 'credentials';
}

export interface ListProfilesResponse {
  // Sorted by name.
  profiles: AwsProfile[];
  // AWS_PROFILE, which the SDK uses when no profile is set.
  envProfile: string | null;
}

// The profiles in the AWS shared config and credentials files.
export const listProfilesContract = defineContract<ListProfilesResponse>()({
  channel: 'aws.listProfiles',
  request: z.void()
});
