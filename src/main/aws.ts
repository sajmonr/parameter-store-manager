import { SSMClient } from '@aws-sdk/client-ssm';
import type { Parameter, ParameterMetadata } from '@aws-sdk/client-ssm';
import { KMSClient } from '@aws-sdk/client-kms';
import {
  createCredentialChain,
  fromEnv,
  fromIni,
  fromProcess
} from '@aws-sdk/credential-providers';
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

export const ssm = () =>
  getClient('ssm', SSMClient, getSetting(availableSettings.ssmRegion));
export const kms = () =>
  getClient('kms', KMSClient, getSetting(availableSettings.kmsRegion));

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
