// Events the main process sends to the renderer, unlike endpoints, which the
// renderer calls.
import type { Settings } from './availableSettings';

export interface IpcEvents {
  'settings.changed': Settings;
  // Settings… was chosen in the app menu.
  'menu.openSettings': undefined;
}

export type IpcEvent = keyof IpcEvents;

// Every event, listed once so the preload can refuse unknown ones. Keyed by
// event, so TypeScript catches one that is added to IpcEvents but not here.
const KNOWN_EVENTS: Record<IpcEvent, true> = {
  'settings.changed': true,
  'menu.openSettings': true
};
export const IPC_EVENTS = Object.keys(KNOWN_EVENTS) as IpcEvent[];
