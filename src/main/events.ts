import type { WebContents } from 'electron';
import type { IpcEvent, IpcEvents } from '../shared/events';

// Sends one of the known events to the renderer, with the payload its type
// says. Events without a payload take none.
export const sendEvent = <E extends IpcEvent>(
  webContents: WebContents,
  event: E,
  ...payload: IpcEvents[E] extends undefined ? [] : [IpcEvents[E]]
) => webContents.send(event, ...payload);
