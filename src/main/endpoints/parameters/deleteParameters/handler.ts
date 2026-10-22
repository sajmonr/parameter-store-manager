import { DeleteParametersCommand } from '@aws-sdk/client-ssm';
import { ssm } from '../../../aws';
import { defineEndpoint } from '../../endpoint';
import { deleteParametersContract } from './deleteParameters.contract';

export default defineEndpoint(deleteParametersContract, async ({ names }) => {
  const res = await ssm().send(new DeleteParametersCommand({ Names: names }));
  return {
    deleted: res.DeletedParameters || [],
    invalid: res.InvalidParameters || []
  };
});
