import { getSource } from '../../../source';
import { defineEndpoint } from '../../endpoint';
import { getSourceContract } from './getSource.contract';

export default defineEndpoint(getSourceContract, () => ({
  source: getSource()
}));
