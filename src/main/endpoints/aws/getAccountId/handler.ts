import { GetCallerIdentityCommand } from '@aws-sdk/client-sts';
import { sts } from '../../../aws';
import { defineEndpoint } from '../../endpoint';
import { getAccountIdContract } from './getAccountId.contract';

export default defineEndpoint(getAccountIdContract, async () => {
  const res = await sts().send(new GetCallerIdentityCommand({}));
  return { accountId: res.Account ?? null };
});
