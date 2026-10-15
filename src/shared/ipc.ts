/**
 * The IPC contract between the main process and the renderer. Main registers
 * a handler per channel, the preload script exposes them as `window.api`, and
 * the renderer calls them through clients/api. All three are typed from here.
 */
import type {
  Parameter,
  ParameterMetadata,
  ParameterTier
} from '@aws-sdk/client-ssm';
import type { Settings } from './availableSettings';

// Dates cross the IPC bridge as ISO strings.
type WithIsoDate<T> = Omit<T, 'LastModifiedDate'> & {
  LastModifiedDate?: string;
};

export type ParameterMetadataDto = WithIsoDate<ParameterMetadata>;
export type ParameterDto = WithIsoDate<Parameter>;

export interface DescribeParametersResult {
  parameters: ParameterMetadataDto[];
  nextToken?: string;
}

export interface GetParametersResult {
  parameters: ParameterDto[];
  invalidParameters: string[];
}

// The types the app can create; StringList parameters are shown but not edited.
export const PARAMETER_TYPES = ['String', 'SecureString'] as const;
export type EditableParameterType = (typeof PARAMETER_TYPES)[number];

export const isEditableType = (type: unknown): type is EditableParameterType =>
  (PARAMETER_TYPES as readonly unknown[]).includes(type);

export interface PutParameterRequest {
  name: string;
  type: EditableParameterType;
  value: string;
  description?: string;
  kmsKey?: string;
  overwrite?: boolean;
}

export interface PutParameterResult {
  version?: number;
  tier?: ParameterTier;
}

export interface DeleteParameterResult {
  name: string;
}

export interface KmsAlias {
  AliasName?: string;
  AliasArn?: string;
  TargetKeyId?: string;
}

export interface AwsProfile {
  name: string;
  source: 'config' | 'credentials';
}

export interface AwsProfilesResult {
  profiles: AwsProfile[];
  // AWS_PROFILE, which the SDK uses when no profile is set.
  envProfile: string | null;
}

export type UpdateCheckResult =
  | { status: 'available'; version: string; url: string; instructions: string }
  | { status: 'already-notified'; version: string }
  | { status: 'up-to-date'; version: string }
  | { status: 'error'; message: string }
  | { status: 'skipped' };

export interface IpcErrorData {
  name: string;
  message: string;
  code?: string;
}

// Errors are returned as data: contextBridge drops custom fields such as the
// AWS error name when an Error is thrown across it.
export type IpcResponse<T> =
  { ok: true; result: T } | { ok: false; error: IpcErrorData };

// Channel -> what the renderer passes and what main resolves to.
export interface IpcChannels {
  'ssm:describeParameters': {
    args: [nextToken?: string];
    result: DescribeParametersResult;
  };
  'ssm:getParameters': { args: [names: string[]]; result: GetParametersResult };
  'ssm:putParameter': {
    args: [params: PutParameterRequest];
    result: PutParameterResult;
  };
  'ssm:deleteParameter': {
    args: [name: string];
    result: DeleteParameterResult;
  };
  'kms:listAliases': { args: []; result: KmsAlias[] };
  'aws:listProfiles': { args: []; result: AwsProfilesResult };
  'settings:getAll': { args: []; result: Settings };
  'settings:set': { args: [values: Partial<Settings>]; result: Settings };
  'updates:check': { args: []; result: UpdateCheckResult };
  'updates:openReleasePage': { args: []; result: void };
}

export type IpcChannel = keyof IpcChannels;
export type IpcArgs<C extends IpcChannel> = IpcChannels[C]['args'];
export type IpcResult<C extends IpcChannel> = IpcChannels[C]['result'];

// Events main sends to the renderer.
export interface IpcEvents {
  'settings:changed': Settings;
}

type Invoke<C extends IpcChannel> = (
  ...args: IpcArgs<C>
) => Promise<IpcResponse<IpcResult<C>>>;

// The `window.api` object exposed by the preload script.
export interface Api {
  parameters: {
    describe: Invoke<'ssm:describeParameters'>;
    getValues: Invoke<'ssm:getParameters'>;
    put: Invoke<'ssm:putParameter'>;
    delete: Invoke<'ssm:deleteParameter'>;
  };
  kms: {
    listAliases: Invoke<'kms:listAliases'>;
  };
  aws: {
    listProfiles: Invoke<'aws:listProfiles'>;
  };
  settings: {
    getAll: Invoke<'settings:getAll'>;
    set: Invoke<'settings:set'>;
    // Returns a function that removes the listener.
    onChange: (callback: (settings: Settings) => void) => () => void;
  };
  updates: {
    check: Invoke<'updates:check'>;
    openReleasePage: Invoke<'updates:openReleasePage'>;
  };
}
