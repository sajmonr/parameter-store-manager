import type { Bridge } from '../shared/bridge';

declare global {
  interface Window {
    // Exposed by the preload script. Use services/clients, not this directly.
    api: Bridge;
  }
}
