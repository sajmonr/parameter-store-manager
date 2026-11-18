import { findService, parse, pathOf, serviceEnvironments } from './structure';
import type { LocationContext } from './location';

// 'current' is the parameter's own environment; 'missing' has no parameter
// with its key.
export type EnvironmentState = 'current' | 'exists' | 'missing';

// Where the parameter `name` is in the structure: its service, environment
// and key, and the parameter with its key in each environment of the
// service. Null with the structure off or for a name under Other paths.
export const parameterPlace = (
  name: string,
  names: { has: (name: string) => boolean },
  { structure, delimiter }: LocationContext
) => {
  const match = parse(name, structure, delimiter);
  const service = match && findService(structure, match.service);
  if (!match || !service) return null;
  const environments = serviceEnvironments(service, structure).map(env => {
    const path = pathOf(
      env.segment,
      match.service,
      match.key,
      structure,
      delimiter
    );
    const state: EnvironmentState =
      env.segment === match.env
        ? 'current'
        : names.has(path)
          ? 'exists'
          : 'missing';
    return { ...env, name: path, state };
  });
  const color = environments.find(e => e.state === 'current')!.color;
  return { ...match, color, environments };
};
