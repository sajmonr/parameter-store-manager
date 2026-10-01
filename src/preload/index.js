import { contextBridge, ipcRenderer } from 'electron';

// The renderer gets these functions and nothing else: no Node, no generic
// ipcRenderer access. Each call resolves to { ok, result } or { ok, error }.
contextBridge.exposeInMainWorld('api', {
  parameters: {
    describe: nextToken =>
      ipcRenderer.invoke('ssm:describeParameters', nextToken),
    getValues: names => ipcRenderer.invoke('ssm:getParameters', names),
    put: params => ipcRenderer.invoke('ssm:putParameter', params),
    delete: name => ipcRenderer.invoke('ssm:deleteParameter', name)
  },
  kms: {
    listAliases: () => ipcRenderer.invoke('kms:listAliases')
  },
  settings: {
    getAll: () => ipcRenderer.invoke('settings:getAll'),
    set: values => ipcRenderer.invoke('settings:set', values),
    onChange: callback => {
      const listener = (_event, settings) => callback(settings);
      ipcRenderer.on('settings:changed', listener);
      return () => ipcRenderer.removeListener('settings:changed', listener);
    }
  }
});
