export type NamingMode = 'structured' | 'path';

export interface Naming {
  mode: NamingMode;
  // Structured mode: '' when no service is configured.
  service: string;
  // The selected environments, in the configured order.
  envs: string[];
  key: string;
  // Path mode.
  path: string;
}
