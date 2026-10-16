// Calls main-process endpoints through the `window.api` bridge.
import type {
  Contract,
  IpcResponse,
  RequestOf,
  ResponseOf
} from '../../shared/contract';

// An error from the main process, with the AWS error code when there is one.
export interface ApiError extends Error {
  code?: string;
}

// Turns an { ok, result | error } response back into a value or a thrown Error.
export const unwrap = <T>(response: IpcResponse<T>): T => {
  if (response && response.ok) return response.result;
  const { name, message, code } = (response && response.error) || {};
  const error: ApiError = new Error(message || 'Unknown error');
  error.name = name || 'Error';
  error.code = code;
  throw error;
};

// Endpoints whose request is optional (or z.void()) can be called without one.
type RequestArgs<C extends Contract> =
  undefined extends RequestOf<C>
    ? [request?: RequestOf<C>]
    : [request: RequestOf<C>];

export const call = async <C extends Contract>(
  contract: C,
  ...[request]: RequestArgs<C>
): Promise<ResponseOf<C>> =>
  unwrap(
    (await window.api.invoke(contract.channel, request)) as IpcResponse<
      ResponseOf<C>
    >
  );
