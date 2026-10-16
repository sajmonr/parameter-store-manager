/**
 * IPC between the renderer and the main process is a set of endpoints. Each
 * endpoint has a contract (a `*.contract.ts` file next to its handler in
 * src/main/endpoints) that both processes import: the channel, the request
 * schema and the response type. Main validates every request against the
 * schema; the renderer calls the endpoint with `call(contract, request)`.
 */
import type { z } from 'zod';

export interface Contract<
  TRequest extends z.ZodType = z.ZodType,
  TResponse = unknown
> {
  channel: string;
  request: TRequest;
  // Type-only: main is trusted, so responses aren't validated at runtime.
  readonly __response?: TResponse;
}

// What the renderer passes; schema defaults may leave fields optional.
export type RequestOf<C extends Contract> = z.input<C['request']>;
// What the handler receives, after validation and defaults.
export type ParsedRequestOf<C extends Contract> = z.output<C['request']>;
export type ResponseOf<C extends Contract> =
  C extends Contract<z.ZodType, infer R> ? R : never;

// Curried so the request type is inferred from the schema while the response
// type is given explicitly: defineContract<Response>()({ channel, request }).
export const defineContract =
  <TResponse>() =>
  <TRequest extends z.ZodType>(contract: {
    channel: string;
    request: TRequest;
  }): Contract<TRequest, TResponse> =>
    contract;

export interface IpcErrorData {
  name: string;
  message: string;
  code?: string;
}

// Errors are returned as data: contextBridge drops custom fields such as the
// AWS error name when an Error is thrown across it.
export type IpcResponse<T> =
  { ok: true; result: T } | { ok: false; error: IpcErrorData };
