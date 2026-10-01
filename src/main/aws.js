import {
  DeleteParameterCommand,
  DescribeParametersCommand,
  GetParametersCommand,
  PutParameterCommand,
  SSMClient
} from '@aws-sdk/client-ssm';
import { KMSClient, paginateListAliases } from '@aws-sdk/client-kms';
import {
  createCredentialChain,
  fromEnv,
  fromIni,
  fromProcess
} from '@aws-sdk/credential-providers';
import { availableSettings, getSetting } from './settings';

// Same as aws-sdk v2's `new EnvironmentCredentials('AMAZON')`.
const fromAmazonEnv = () => async () => {
  const {
    AMAZON_ACCESS_KEY_ID: accessKeyId,
    AMAZON_SECRET_ACCESS_KEY: secretAccessKey,
    AMAZON_SESSION_TOKEN: sessionToken
  } = process.env;
  if (!accessKeyId || !secretAccessKey) {
    const error = new Error('AMAZON_* credentials are not set.');
    // Lets createCredentialChain move on to the next provider.
    error.tryNextLink = true;
    throw error;
  }
  return { accessKeyId, secretAccessKey, sessionToken };
};

// Order matches the v2 chain: env AWS_* -> env AMAZON_* -> shared ini profile
// (which also covers SSO, assumed roles and credential_process) -> credential_process.
export const createCredentialProvider = profile => {
  const options = { profile: profile || undefined, ignoreCache: true };
  return createCredentialChain(
    fromEnv(),
    fromAmazonEnv(),
    fromIni(options),
    fromProcess(options)
  );
};

const clients = new Map();

// One client per region and profile, so changing either in settings takes
// effect on the next request without restarting the app.
const getClient = (service, Client, region) => {
  const profile = getSetting(availableSettings.profile);
  const key = `${service}|${region}|${profile}`;
  if (!clients.has(key)) {
    clients.set(
      key,
      new Client({
        region,
        credentials: createCredentialProvider(profile),
        // Loading all parameters makes many SSM calls in a row; adaptive mode
        // slows down client-side when AWS starts throttling instead of failing.
        retryMode: 'adaptive',
        maxAttempts: 8
      })
    );
  }
  return clients.get(key);
};

const ssm = () =>
  getClient('ssm', SSMClient, getSetting(availableSettings.ssmRegion));
const kms = () =>
  getClient('kms', KMSClient, getSetting(availableSettings.kmsRegion));

// Dates are sent to the renderer as ISO strings.
const toPlainParameter = ({ LastModifiedDate, ...rest }) => ({
  ...rest,
  LastModifiedDate: LastModifiedDate
    ? LastModifiedDate.toISOString()
    : undefined
});

export const describeParameters = async nextToken => {
  const res = await ssm().send(
    new DescribeParametersCommand({ NextToken: nextToken, MaxResults: 50 })
  );
  return {
    parameters: (res.Parameters || []).map(toPlainParameter),
    nextToken: res.NextToken
  };
};

export const getParameters = async names => {
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
}) => {
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

export const deleteParameter = async name => {
  await ssm().send(new DeleteParameterCommand({ Name: name }));
  return { name };
};

// Only aliases that point at a key can be used to encrypt a SecureString.
export const listKmsAliases = async () => {
  const aliases = [];

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
