import { getAccountIdContract } from '../../main/endpoints/aws/getAccountId/getAccountId.contract';
import { call } from '../clients/call';

export const accountService = {
  getId: async () => (await call(getAccountIdContract)).accountId
};
