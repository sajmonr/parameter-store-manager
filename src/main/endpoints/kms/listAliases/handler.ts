import { paginateListAliases } from '@aws-sdk/client-kms';
import { kms } from '../../../aws';
import { defineEndpoint } from '../../endpoint';
import { listAliasesContract } from './listAliases.contract';
import type { KmsAlias } from './listAliases.contract';

export default defineEndpoint(listAliasesContract, async () => {
  const aliases: KmsAlias[] = [];
  for await (const page of paginateListAliases(
    { client: kms() },
    { Limit: 100 }
  )) {
    (page.Aliases || [])
      .filter(alias => alias.TargetKeyId)
      .forEach(({ AliasName, AliasArn, TargetKeyId }) =>
        aliases.push({ AliasName, AliasArn, TargetKeyId })
      );
  }
  return aliases;
});
