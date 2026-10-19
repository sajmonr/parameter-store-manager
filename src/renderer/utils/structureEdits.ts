// Changes made to the structure setting from the Settings page. Each returns
// a new structure and keeps the services' environment lists consistent with
// the environments.
import { ENVIRONMENT_COLORS } from '../../shared/structure';
import type { EnvironmentColor, Structure } from '../../shared/structure';

// The first preset no environment uses yet; once all are used, they repeat
// in order.
export const nextColor = ({ environments }: Structure): EnvironmentColor =>
  ENVIRONMENT_COLORS.find(
    color => !environments.some(e => e.color === color)
  ) ?? ENVIRONMENT_COLORS[environments.length % ENVIRONMENT_COLORS.length]!;

export const addEnvironment = (
  structure: Structure,
  segment: string,
  color: EnvironmentColor
): Structure => ({
  ...structure,
  environments: [...structure.environments, { segment, color }]
});

export const renameEnvironment = (
  structure: Structure,
  from: string,
  to: string
): Structure => ({
  ...structure,
  environments: structure.environments.map(e =>
    e.segment === from ? { ...e, segment: to } : e
  ),
  services: structure.services.map(s => ({
    ...s,
    environments: s.environments.map(env => (env === from ? to : env))
  }))
});

// Its parameters move to Other paths.
export const removeEnvironment = (
  structure: Structure,
  segment: string
): Structure => ({
  ...structure,
  environments: structure.environments.filter(e => e.segment !== segment),
  services: structure.services.map(s => ({
    ...s,
    environments: s.environments.filter(env => env !== segment)
  }))
});

// Moves the environment `from` to where `to` is.
export const moveEnvironment = (
  structure: Structure,
  from: string,
  to: string
): Structure => {
  const environments = [...structure.environments];
  const fromIndex = environments.findIndex(e => e.segment === from);
  const toIndex = environments.findIndex(e => e.segment === to);
  if (fromIndex < 0 || toIndex < 0) return structure;
  environments.splice(toIndex, 0, ...environments.splice(fromIndex, 1));
  return { ...structure, environments };
};

export const setEnvironmentColor = (
  structure: Structure,
  segment: string,
  color: EnvironmentColor
): Structure => ({
  ...structure,
  environments: structure.environments.map(e =>
    e.segment === segment ? { ...e, color } : e
  )
});

// A new service starts in every environment.
export const addService = (
  structure: Structure,
  segment: string
): Structure => ({
  ...structure,
  services: [
    ...structure.services,
    { segment, environments: structure.environments.map(e => e.segment) }
  ]
});

export const removeService = (
  structure: Structure,
  segment: string
): Structure => ({
  ...structure,
  services: structure.services.filter(s => s.segment !== segment)
});

// Checks or unchecks a combination. The list is kept in environment order.
export const setServiceEnvironment = (
  structure: Structure,
  service: string,
  env: string,
  checked: boolean
): Structure => ({
  ...structure,
  services: structure.services.map(s => {
    if (s.segment !== service) return s;
    const environments = structure.environments
      .map(e => e.segment)
      .filter(segment =>
        segment === env ? checked : s.environments.includes(segment)
      );
    return { ...s, environments };
  })
});
