import { SSMClient } from '@aws-sdk/client-ssm';
import type { Parameter, ParameterMetadata } from '@aws-sdk/client-ssm';
import { KMSClient } from '@aws-sdk/client-kms';
import { STSClient } from '@aws-sdk/client-sts';
import {
  createCredentialChain,
  fromEnv,
  fromIni,
  fromProcess
} from '@aws-sdk/credential-providers';
import { withCallLog } from './awsLog';
import { withFakeSource } from './fake/fakeAws';
import { availableSettings, getSetting } from './settings';
import { isFakeSource } from './source';

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

// Never sent anywhere: the fake source answers before credentials are used.
const fakeCredentials = async () => ({
  accessKeyId: 'FAKE',
  secretAccessKey: 'FAKE'
});

interface ClientConfig {
  region: string;
  credentials:
    ReturnType<typeof createCredentialProvider> | typeof fakeCredentials;
  retryMode: string;
  maxAttempts: number;
}

type AwsClient = SSMClient | KMSClient | STSClient;

const clients = new Map<string, AwsClient>();

// One client per region and profile, so changing either in settings takes
// effect on the next request without restarting the app.
const getClient = <T extends AwsClient>(
  service: string,
  Client: new (config: ClientConfig) => T,
  region: string
): T => {
  const profile = getSetting(availableSettings.profile);
  const key = `${service}|${region}|${profile}`;
  let client = clients.get(key) as T | undefined;
  if (!client) {
    const fake = isFakeSource();
    client = new Client({
      region,
      credentials: fake ? fakeCredentials : createCredentialProvider(profile),
      // Loading all parameters makes many SSM calls in a row; adaptive mode
      // slows down client-side when AWS starts throttling instead of failing.
      retryMode: 'adaptive',
      maxAttempts: 8
    });
    withCallLog(
      client,
      service.toUpperCase(),
      `${region}, profile ${profile || 'default'}${fake ? ', fake' : ''}`
    );
    if (fake) withFakeSource(client);
    clients.set(key, client);
  }
  return client;
};

export const ssm = () =>
  getClient('ssm', SSMClient, getSetting(availableSettings.ssmRegion));
export const kms = () =>
  getClient('kms', KMSClient, getSetting(availableSettings.kmsRegion));
// The account is the same in every region; the SSM region avoids a second
// region the user may not have enabled.
export const sts = () =>
  getClient('sts', STSClient, getSetting(availableSettings.ssmRegion));

// Dates are sent to the renderer as ISO strings.
export const toPlainParameter = <T extends Parameter | ParameterMetadata>({
  LastModifiedDate,
  ...rest
}: T) => ({
  ...rest,
  LastModifiedDate: LastModifiedDate
    ? LastModifiedDate.toISOString()
    : undefined
});
