import { contextBridge, ipcRenderer } from 'electron';
import type { IpcRendererEvent } from 'electron';
import type {
  Api,
  IpcArgs,
  IpcChannel,
  IpcEvents,
  IpcResponse,
  IpcResult
} from '../shared/ipc';

const invoke = <C extends IpcChannel>(
  channel: C,
  ...args: IpcArgs<C>
): Promise<IpcResponse<IpcResult<C>>> => ipcRenderer.invoke(channel, ...args);

const on = <E extends keyof IpcEvents>(
  channel: E,
  callback: (payload: IpcEvents[E]) => void
) => {
  const listener = (_event: IpcRendererEvent, payload: IpcEvents[E]) =>
    callback(payload);
  ipcRenderer.on(channel, listener);
  return () => {
    ipcRenderer.removeListener(channel, listener);
  };
};

// The renderer gets these functions and nothing else: no Node, no generic
// ipcRenderer access. Each call resolves to { ok, result } or { ok, error }.
const api: Api = {
  parameters: {
    describe: nextToken => invoke('ssm:describeParameters', nextToken),
    getValues: names => invoke('ssm:getParameters', names),
    put: params => invoke('ssm:putParameter', params),
    delete: name => invoke('ssm:deleteParameter', name)
  },
  kms: {
    listAliases: () => invoke('kms:listAliases')
  },
  aws: {
    listProfiles: () => invoke('aws:listProfiles')
  },
  settings: {
    getAll: () => invoke('settings:getAll'),
    set: values => invoke('settings:set', values),
    onChange: callback => on('settings:changed', callback)
  },
  updates: {
    check: () => invoke('updates:check'),
    openReleasePage: () => invoke('updates:openReleasePage')
  }
};

contextBridge.exposeInMainWorld('api', api);
