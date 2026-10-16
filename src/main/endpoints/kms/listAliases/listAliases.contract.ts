import { z } from 'zod';
import { defineContract } from '../../../../shared/contract';

export interface KmsAlias {
  AliasName?: string;
  AliasArn?: string;
  TargetKeyId?: string;
}

// The aliases that point at a key, so they can encrypt a SecureString.
export const listAliasesContract = defineContract<KmsAlias[]>()({
  channel: 'kms.listAliases',
  request: z.void()
});
