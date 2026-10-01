import log from 'electron-log/main';
import * as aws from './aws';
import { getAllSettings, setSettings } from './settings';

const PARAMETER_TYPES = ['String', 'SecureString'];
// SSM GetParameters accepts at most 10 names per call.
const MAX_NAMES_PER_REQUEST = 10;

const isString = value => typeof value === 'string';
const isOptionalString = value => value === undefined || isString(value);

const invalid = message => {
  const error = new TypeError(message);
  error.name = 'InvalidRequest';
  return error;
};

export const handlers = {
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
    const { name, type, value, description, kmsKey, overwrite } = params || {};
    if (!isString(name) || !name) throw invalid('name is required.');
    if (!PARAMETER_TYPES.includes(type)) throw invalid('Unsupported type.');
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

  'settings:getAll': () => getAllSettings(),

  'settings:set': values => setSettings(values)
};

// Only the app's own page may call these handlers.
export const isTrustedSender = (frame, devServerUrl) => {
  const url = frame && frame.url;
  if (!url) return false;
  if (devServerUrl) return url.startsWith(devServerUrl);
  return url.startsWith('file://');
};

// Errors are returned as plain data: contextBridge drops custom fields such as
// the AWS error name when an Error is thrown across it.
export const toErrorResult = error => ({
  ok: false,
  error: {
    name: error.name || 'Error',
    message: error.message || String(error),
    code: error.Code || error.code || error.name
  }
});

export const invokeHandler = async (channel, args) => {
  try {
    return { ok: true, result: await handlers[channel](...args) };
  } catch (error) {
    log.error(`IPC ${channel} failed:`, error);
    return toErrorResult(error);
  }
};

export const registerIpcHandlers = (ipcMain, devServerUrl) => {
  Object.keys(handlers).forEach(channel => {
    ipcMain.handle(channel, (event, ...args) => {
      if (!isTrustedSender(event.senderFrame, devServerUrl)) {
        return toErrorResult(invalid('Untrusted sender.'));
      }
      return invokeHandler(channel, args);
    });
  });
};
