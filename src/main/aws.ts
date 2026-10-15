import {
  DeleteParameterCommand,
  DescribeParametersCommand,
  GetParametersCommand,
  PutParameterCommand,
  SSMClient
} from '@aws-sdk/client-ssm';
import type { Parameter, ParameterMetadata } from '@aws-sdk/client-ssm';
import { KMSClient, paginateListAliases } from '@aws-sdk/client-kms';
import {
  createCredentialChain,
  fromEnv,
  fromIni,
  fromProcess
} from '@aws-sdk/credential-providers';
import type {
  DeleteParameterResult,
  DescribeParametersResult,
  GetParametersResult,
  KmsAlias,
  PutParameterRequest,
  PutParameterResult
} from '../shared/ipc';
import { availableSettings, getSetting } from './settings';

// Order: env AWS_* -> shared ini profile (which also covers SSO, assumed
// roles and credential_process) -> credential_process.
export const createCredentialProvider = (profile: string) => {
  const options = { profile: profile || undefined, ignoreCache: true };
  return createCredentialChain(
    fromEnv(),
    fromIni(options),
    fromProcess(options)
  );
};

interface ClientConfig {
  region: string;
  credentials: ReturnType<typeof createCredentialProvider>;
  retryMode: string;
  maxAttempts: number;
}

const clients = new Map<string, SSMClient | KMSClient>();

// One client per region and profile, so changing either in settings takes
// effect on the next request without restarting the app.
const getClient = <T extends SSMClient | KMSClient>(
  service: string,
  Client: new (config: ClientConfig) => T,
  region: string
): T => {
  const profile = getSetting(availableSettings.profile);
  const key = `${service}|${region}|${profile}`;
  let client = clients.get(key) as T | undefined;
  if (!client) {
    client = new Client({
      region,
      credentials: createCredentialProvider(profile),
      // Loading all parameters makes many SSM calls in a row; adaptive mode
      // slows down client-side when AWS starts throttling instead of failing.
      retryMode: 'adaptive',
      maxAttempts: 8
    });
    clients.set(key, client);
  }
  return client;
};

const ssm = () =>
  getClient('ssm', SSMClient, getSetting(availableSettings.ssmRegion));
const kms = () =>
  getClient('kms', KMSClient, getSetting(availableSettings.kmsRegion));

// Dates are sent to the renderer as ISO strings.
const toPlainParameter = <T extends Parameter | ParameterMetadata>({
  LastModifiedDate,
  ...rest
}: T) => ({
  ...rest,
  LastModifiedDate: LastModifiedDate
    ? LastModifiedDate.toISOString()
    : undefined
});

export const describeParameters = async (
  nextToken?: string
): Promise<DescribeParametersResult> => {
  const res = await ssm().send(
    new DescribeParametersCommand({ NextToken: nextToken, MaxResults: 50 })
  );
  return {
    parameters: (res.Parameters || []).map(toPlainParameter),
    nextToken: res.NextToken
  };
};

export const getParameters = async (
  names: string[]
): Promise<GetParametersResult> => {
  const res = await ssm().send(
    new GetParametersCommand({ Names: names, WithDecryption: true })
  );
  return {
    parameters: (res.Parameters || []).map(toPlainParameter),
    invalidParameters: res.InvalidParameters || []
  };
};

export const putParameter = async ({
  name,
  type,
  value,
  description,
  kmsKey,
  overwrite
}: PutParameterRequest): Promise<PutParameterResult> => {
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
};

export const deleteParameter = async (
  name: string
): Promise<DeleteParameterResult> => {
  await ssm().send(new DeleteParameterCommand({ Name: name }));
  return { name };
};

// Only aliases that point at a key can be used to encrypt a SecureString.
export const listKmsAliases = async (): Promise<KmsAlias[]> => {
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
};
