import log from 'electron-log/main';
import type { IpcMain } from 'electron';
import { PARAMETER_TYPES } from '../shared/ipc';
import type {
  EditableParameterType,
  IpcChannel,
  IpcErrorData,
  IpcResponse,
  IpcResult
} from '../shared/ipc';
import * as aws from './aws';
import { listProfiles } from './awsProfiles';
import { getAllSettings, setSettings } from './settings';
import { checkForRenderer, openReleasePage } from './updates';

// SSM GetParameters accepts at most 10 names per call.
const MAX_NAMES_PER_REQUEST = 10;

const isString = (value: unknown): value is string => typeof value === 'string';
const isOptionalString = (value: unknown): value is string | undefined =>
  value === undefined || isString(value);
const isParameterType = (value: unknown): value is EditableParameterType =>
  (PARAMETER_TYPES as readonly unknown[]).includes(value);

const invalid = (message: string) => {
  const error = new TypeError(message);
  error.name = 'InvalidRequest';
  return error;
};

// Arguments come from the renderer, so every handler validates them.
type Handlers = {
  [C in IpcChannel]: (
    ...args: unknown[]
  ) => IpcResult<C> | Promise<IpcResult<C>>;
};

export const handlers: Handlers = {
  'ssm:describeParameters': nextToken => {
    if (!isOptionalString(nextToken))
      throw invalid('nextToken must be a string.');
    return aws.describeParameters(nextToken);
  },

  'ssm:getParameters': names => {
    if (
      !Array.isArray(names) ||
      names.length === 0 ||
      names.length > MAX_NAMES_PER_REQUEST ||
      !names.every(isString)
    ) {
      throw invalid(
        `names must be 1-${MAX_NAMES_PER_REQUEST} parameter names.`
      );
    }
    return aws.getParameters(names);
  },

  'ssm:putParameter': params => {
    const { name, type, value, description, kmsKey, overwrite } = (params ||
      {}) as Record<string, unknown>;
    if (!isString(name) || !name) throw invalid('name is required.');
    if (!isParameterType(type)) throw invalid('Unsupported type.');
    if (!isString(value)) throw invalid('value must be a string.');
    if (!isOptionalString(description) || !isOptionalString(kmsKey)) {
      throw invalid('description and kmsKey must be strings.');
    }
    return aws.putParameter({
      name,
      type,
      value,
      description,
      kmsKey,
      overwrite: overwrite === true
    });
  },

  'ssm:deleteParameter': name => {
    if (!isString(name) || !name) throw invalid('name is required.');
    return aws.deleteParameter(name);
  },

  'kms:listAliases': () => aws.listKmsAliases(),

  'aws:listProfiles': () => listProfiles(),

  'settings:getAll': () => getAllSettings(),

  'settings:set': values => setSettings(values),

  // Neither takes renderer input: the URL to open is decided in the main process.
  'updates:check': () => checkForRenderer(),

  'updates:openReleasePage': () => openReleasePage()
};

// Only the app's own page may call these handlers.
export const isTrustedSender = (
  frame: { url: string } | null | undefined,
  devServerUrl?: string
) => {
  const url = frame && frame.url;
  if (!url) return false;
  if (devServerUrl) return url.startsWith(devServerUrl);
  return url.startsWith('file://');
};

// Some AWS SDK errors carry a `Code`; Node errors carry `code`.
interface ErrorLike {
  name?: string;
  message?: string;
  Code?: string;
  code?: string;
}

// Errors are returned as plain data: contextBridge drops custom fields such as
// the AWS error name when an Error is thrown across it.
export const toErrorResult = (
  error: unknown
): { ok: false; error: IpcErrorData } => {
  const { name, message, Code, code } = (error ?? {}) as ErrorLike;
  return {
    ok: false,
    error: {
      name: name || 'Error',
      message: message || String(error),
      code: Code || code || name
    }
  };
};

export const invokeHandler = async (
  channel: IpcChannel,
  args: unknown[]
): Promise<IpcResponse<unknown>> => {
  try {
    return { ok: true, result: await handlers[channel](...args) };
  } catch (error) {
    log.error(`IPC ${channel} failed:`, error);
    return toErrorResult(error);
  }
};

export const registerIpcHandlers = (
  ipcMain: Pick<IpcMain, 'handle'>,
  devServerUrl?: string
) => {
  (Object.keys(handlers) as IpcChannel[]).forEach(channel => {
    ipcMain.handle(channel, (event, ...args: unknown[]) => {
      if (!isTrustedSender(event.senderFrame, devServerUrl)) {
        return toErrorResult(invalid('Untrusted sender.'));
      }
      return invokeHandler(channel, args);
    });
  });
};
