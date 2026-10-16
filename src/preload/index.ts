import { contextBridge, ipcRenderer } from 'electron';
import type { IpcRendererEvent } from 'electron';
import type { Bridge } from '../shared/bridge';
import type { IpcResponse } from '../shared/contract';
import { IPC_EVENTS } from '../shared/events';

// The renderer gets these two functions and nothing else: no Node, no generic
// ipcRenderer access. `invoke` reaches only the endpoints main registered, and
// main validates every request; `on` only listens to the known events.
const api: Bridge = {
  invoke: (channel, request) =>
    ipcRenderer.invoke(channel, request) as Promise<IpcResponse<unknown>>,
  on: (event, callback) => {
    if (!IPC_EVENTS.includes(event)) throw new Error(`Unknown event ${event}`);
    const listener = (
      _event: IpcRendererEvent,
      payload: Parameters<typeof callback>[0]
    ) => callback(payload);
    ipcRenderer.on(event, listener);
    return () => {
      ipcRenderer.removeListener(event, listener);
    };
  }
};

contextBridge.exposeInMainWorld('api', api);
