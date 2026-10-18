import type {
  ParameterDto,
  ParameterMetadataDto
} from '../../main/endpoints/parameters/parameter.contract';
import { describeParametersContract } from '../../main/endpoints/parameters/describeParameters/describeParameters.contract';
import { getParameterValuesContract } from '../../main/endpoints/parameters/getParameterValues/getParameterValues.contract';
import { putParameterContract } from '../../main/endpoints/parameters/putParameter/putParameter.contract';
import type { PutParameterRequest } from '../../main/endpoints/parameters/putParameter/putParameter.contract';
import { deleteParameterContract } from '../../main/endpoints/parameters/deleteParameter/deleteParameter.contract';
import { call } from '../clients/call';

type WithDate<T> = Omit<T, 'LastModifiedDate'> & { LastModifiedDate?: Date };

// What DescribeParameters returns: everything but the value.
export type ParameterMetadata = WithDate<ParameterMetadataDto>;
// What GetParameters returns, including the decrypted value.
export type Parameter = WithDate<ParameterDto>;

// Dates cross the IPC bridge as ISO strings.
const reviveDate = <T extends { LastModifiedDate?: string }>(
  parameter: T
): WithDate<T> => ({
  ...parameter,
  LastModifiedDate: parameter.LastModifiedDate
    ? new Date(parameter.LastModifiedDate)
    : undefined
});

export const parametersService = {
  // One page of parameters, without values. With `beginsWith`, only the
  // names that start with it.
  describe: async (nextToken?: string, beginsWith?: string) => {
    const page = await call(describeParametersContract, {
      nextToken,
      beginsWith
    });
    return {
      ...page,
      parameters: page.parameters.map((p): ParameterMetadata => reviveDate(p))
    };
  },

  // At most 10 names per call. Without `withDecryption`, SecureString values
  // stay encrypted.
  getValues: async (names: string[], withDecryption = true) => {
    const res = await call(getParameterValuesContract, {
      names,
      withDecryption
    });
    return {
      ...res,
      parameters: res.parameters.map((p): Parameter => reviveDate(p))
    };
  },

  put: (request: PutParameterRequest) => call(putParameterContract, request),

  delete: (name: string) => call(deleteParameterContract, { name })
};
