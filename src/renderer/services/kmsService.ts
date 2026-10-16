import { listAliasesContract } from '../../main/endpoints/kms/listAliases/listAliases.contract';
import { call } from '../clients/call';

export const kmsService = {
  listAliases: () => call(listAliasesContract)
};
