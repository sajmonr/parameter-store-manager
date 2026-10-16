/// <reference types="vite/types/importMeta.d.ts" />
/**
 * Registers every endpoint below this folder with ipcMain. An endpoint is a
 * `handler.ts` whose default export is defineEndpoint(contract, handler);
 * see shared/contract.ts.
 */
import log from 'electron-log/main';
import type { IpcMain } from 'electron';
import { z } from 'zod';
import type { IpcErrorData, IpcResponse } from '../../shared/contract';
import type { Endpoint } from './endpoint';

const modules = import.meta.glob<Endpoint>('./**/handler.ts', {
  eager: true,
  import: 'default'
});

// By channel.
export const endpoints = new Map<string, Endpoint>();
Object.values(modules).forEach(endpoint => {
  const { channel } = endpoint.contract;
  if (endpoints.has(channel)) {
    throw new Error(`More than one endpoint uses the channel ${channel}.`);
  }
  endpoints.set(channel, endpoint);
});

// Only the app's own page may call the endpoints.
export const isTrustedSender = (
  frame: { url: string } | null | undefined,
  devServerUrl?: string
) => {
  const url = frame && frame.url;
  if (!url) return false;
  if (devServerUrl) return url.startsWith(devServerUrl);
  return url.startsWith('file://');
};

const failure = (error: IpcErrorData): IpcResponse<never> => ({
  ok: false,
  error
});

// Some AWS SDK errors carry a `Code`; Node errors carry `code`.
interface ErrorLike {
  name?: string;
  message?: string;
  Code?: string;
  code?: string;
}

export const toErrorResult = (error: unknown) => {
  const { name, message, Code, code } = (error ?? {}) as ErrorLike;
  return failure({
    name: name || 'Error',
    message: message || String(error),
    code: Code || code || name
  });
};

export const invokeEndpoint = async (
  { contract, handle }: Endpoint,
  request: unknown
): Promise<IpcResponse<unknown>> => {
  // The renderer is untrusted, so every request is validated.
  const parsed = contract.request.safeParse(request);
  if (!parsed.success) {
    const message = z.prettifyError(parsed.error);
    log.warn(`IPC ${contract.channel} got an invalid request:`, message);
    return failure({ name: 'InvalidRequest', message });
  }
  try {
    return { ok: true, result: await handle(parsed.data) };
  } catch (error) {
    log.error(`IPC ${contract.channel} failed:`, error);
    return toErrorResult(error);
  }
};

export const registerEndpoints = (
  ipcMain: Pick<IpcMain, 'handle'>,
  devServerUrl?: string
) => {
  endpoints.forEach((endpoint, channel) => {
    ipcMain.handle(channel, (event, request: unknown) =>
      isTrustedSender(event.senderFrame, devServerUrl)
        ? invokeEndpoint(endpoint, request)
        : failure({ name: 'InvalidRequest', message: 'Untrusted sender.' })
    );
  });
};
