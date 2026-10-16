import { PutParameterCommand } from '@aws-sdk/client-ssm';
import { ssm } from '../../../aws';
import { defineEndpoint } from '../../endpoint';
import { putParameterContract } from './putParameter.contract';

export default defineEndpoint(
  putParameterContract,
  async ({ name, type, value, description, kmsKey, overwrite }) => {
    const res = await ssm().send(
      new PutParameterCommand({
        Name: name,
        Type: type,
        Value: value,
        Description: description,
        KeyId: type === 'SecureString' ? kmsKey : undefined,
        Overwrite: overwrite,
        // AWS rejects tags together with Overwrite.
        Tags: overwrite
          ? undefined
          : [{ Key: 'createdFrom', Value: 'ParameterStoreManager' }]
      })
    );
    return { version: res.Version, tier: res.Tier };
  }
);
