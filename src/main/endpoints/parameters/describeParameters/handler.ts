import { DescribeParametersCommand } from '@aws-sdk/client-ssm';
import { ssm, toPlainParameter } from '../../../aws';
import { defineEndpoint } from '../../endpoint';
import { describeParametersContract } from './describeParameters.contract';

export default defineEndpoint(
  describeParametersContract,
  async ({ nextToken }) => {
    const res = await ssm().send(
      new DescribeParametersCommand({ NextToken: nextToken, MaxResults: 50 })
    );
    return {
      parameters: (res.Parameters || []).map(toPlainParameter),
      nextToken: res.NextToken
    };
  }
);
