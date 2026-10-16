import { DeleteParameterCommand } from '@aws-sdk/client-ssm';
import { ssm } from '../../../aws';
import { defineEndpoint } from '../../endpoint';
import { deleteParameterContract } from './deleteParameter.contract';

export default defineEndpoint(deleteParameterContract, async ({ name }) => {
  await ssm().send(new DeleteParameterCommand({ Name: name }));
  return { name };
});
