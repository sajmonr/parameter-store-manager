import { DescribeParametersCommand } from '@aws-sdk/client-ssm';
import { ssm, toPlainParameter } from '../../../aws';
import { defineEndpoint } from '../../endpoint';
import {
  DESCRIBE_PAGE_SIZE,
  describeParametersContract
} from './describeParameters.contract';

export default defineEndpoint(
  describeParametersContract,
  async ({ nextToken, beginsWith }) => {
    const res = await ssm().send(
      new DescribeParametersCommand({
        NextToken: nextToken,
        MaxResults: DESCRIBE_PAGE_SIZE,
        ParameterFilters: beginsWith
          ? [{ Key: 'Name', Option: 'BeginsWith', Values: [beginsWith] }]
          : undefined
      })
    );
    return {
      parameters: (res.Parameters || []).map(toPlainParameter),
      nextToken: res.NextToken
    };
  }
);
