import { getSourceContract } from '../../main/endpoints/app/getSource/getSource.contract';
import { call } from '../clients/call';

export const sourceService = {
  get: async () => (await call(getSourceContract)).source
};
