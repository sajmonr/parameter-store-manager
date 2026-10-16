import { GetParametersCommand } from '@aws-sdk/client-ssm';
import { ssm, toPlainParameter } from '../../../aws';
import { defineEndpoint } from '../../endpoint';
import { getParameterValuesContract } from './getParameterValues.contract';

export default defineEndpoint(getParameterValuesContract, async ({ names }) => {
  const res = await ssm().send(
    new GetParametersCommand({ Names: names, WithDecryption: true })
  );
  return {
    parameters: (res.Parameters || []).map(toPlainParameter),
    invalidParameters: res.InvalidParameters || []
  };
});
