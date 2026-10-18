import { z } from 'zod';
import { defineContract } from '../../../../shared/contract';

export interface GetAccountIdResponse {
  accountId: string | null;
}

// The AWS account of the current credentials. GetCallerIdentity needs no IAM
// permission, so this works for every user who can reach AWS.
export const getAccountIdContract = defineContract<GetAccountIdResponse>()({
  channel: 'aws.getAccountId',
  request: z.void()
});
