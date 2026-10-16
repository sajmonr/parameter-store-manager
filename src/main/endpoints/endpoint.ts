import type {
  Contract,
  ParsedRequestOf,
  ResponseOf
} from '../../shared/contract';

export interface Endpoint {
  contract: Contract;
  // Called with a request that already passed the contract's schema.
  handle: (request: unknown) => Promise<unknown>;
}

// An endpoint is a contract and its handler. The handler gets the validated
// request and must return the contract's response type.
export const defineEndpoint = <C extends Contract>(
  contract: C,
  handler: (
    request: ParsedRequestOf<C>
  ) => ResponseOf<C> | Promise<ResponseOf<C>>
): Endpoint => ({
  contract,
  handle: async request => handler(request as ParsedRequestOf<C>)
});
