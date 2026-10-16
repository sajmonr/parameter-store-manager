// Events the main process sends to the renderer, unlike endpoints, which the
// renderer calls.
import type { Settings } from './availableSettings';

export interface IpcEvents {
  'settings.changed': Settings;
}

export type IpcEvent = keyof IpcEvents;

export const IPC_EVENTS: IpcEvent[] = ['settings.changed'];
