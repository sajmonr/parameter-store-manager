// Thin wrapper around the `window.api` bridge exposed by the preload script.
import type { Settings } from '../../shared/availableSettings';
import type {
  IpcResponse,
  ParameterDto,
  ParameterMetadataDto,
  PutParameterRequest
} from '../../shared/ipc';

// An error from the main process, with the AWS error code when there is one.
export interface ApiError extends Error {
  code?: string;
}

type WithDate<T> = Omit<T, 'LastModifiedDate'> & { LastModifiedDate?: Date };

// What DescribeParameters returns: everything but the value.
export type ParameterMetadata = WithDate<ParameterMetadataDto>;
// What GetParameters returns, including the decrypted value.
export type Parameter = WithDate<ParameterDto>;

// Turns an { ok, result | error } response back into a value or a thrown Error.
export const unwrap = <T>(response: IpcResponse<T>): T => {
  if (response && response.ok) return response.result;
  const { name, message, code } = (response && response.error) || {};
  const error: ApiError = new Error(message || 'Unknown error');
  error.name = name || 'Error';
  error.code = code;
  throw error;
};

// Dates cross the IPC bridge as ISO strings.
const reviveParameter = <T extends { LastModifiedDate?: string }>(
  parameter: T
): Omit<T, 'LastModifiedDate'> & { LastModifiedDate?: Date } => ({
  ...parameter,
  LastModifiedDate: parameter.LastModifiedDate
    ? new Date(parameter.LastModifiedDate)
    : undefined
});

const bridge = () => window.api;

export const describeParameters = async (nextToken?: string) => {
  const res = unwrap(await bridge().parameters.describe(nextToken));
  return {
    ...res,
    parameters: res.parameters.map(
      (p: ParameterMetadataDto): ParameterMetadata => reviveParameter(p)
    )
  };
};

export const getParameters = async (names: string[]) => {
  const res = unwrap(await bridge().parameters.getValues(names));
  return {
    ...res,
    parameters: res.parameters.map((p: ParameterDto): Parameter =>
      reviveParameter(p)
    )
  };
};

export const putParameter = async (params: PutParameterRequest) =>
  unwrap(await bridge().parameters.put(params));

export const deleteParameter = async (name: string) =>
  unwrap(await bridge().parameters.delete(name));

export const listKmsAliases = async () =>
  unwrap(await bridge().kms.listAliases());

export const listProfiles = async () =>
  unwrap(await bridge().aws.listProfiles());

export const getAllSettings = async () =>
  unwrap(await bridge().settings.getAll());

export const setSettings = async (values: Partial<Settings>) =>
  unwrap(await bridge().settings.set(values));

export const onSettingsChange = (callback: (settings: Settings) => void) =>
  bridge().settings.onChange(callback);

export const checkForUpdates = async () =>
  unwrap(await bridge().updates.check());

export const openReleasePage = async () =>
  unwrap(await bridge().updates.openReleasePage());
