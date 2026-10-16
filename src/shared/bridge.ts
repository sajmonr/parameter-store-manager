import type { IpcEvent, IpcEvents } from './events';
import type { IpcResponse } from './contract';

// The `window.api` object the preload script exposes. The renderer calls it
// through clients/call, never directly.
export interface Bridge {
  invoke: (channel: string, request: unknown) => Promise<IpcResponse<unknown>>;
  // Returns a function that removes the listener.
  on: <E extends IpcEvent>(
    event: E,
    callback: (payload: IpcEvents[E]) => void
  ) => () => void;
}
