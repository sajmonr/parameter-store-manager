// Keeps a location valid as the structure changes.
import type { ParameterView } from '../../../shared/structure';
import { envFor, findEnvironment, findService } from '../structure';
import { convert, initialLocation } from './convert';
import {
  ALL_PARAMETERS,
  isEnvironmentLocation,
  isServiceLocation,
  otherPaths,
  placeIn
} from './types';
import type {
  EnvironmentLocation,
  Location,
  LocationContext,
  ServiceLocation
} from './types';

interface Preferences {
  defaultView: ParameterView;
  // The environment last picked in a grouped view.
  lastEnv: string | null;
}

// Another service when the service was removed, preferring one in the
// environment shown; another environment when the service isn't in it.
const validService = (
  current: ServiceLocation,
  { structure }: LocationContext,
  lastEnv: string | null
): Location => {
  const preferredEnv = current.env || lastEnv;
  const same = findService(structure, current.service);
  const service =
    same ??
    structure.services.find(
      s => !!preferredEnv && s.environments.includes(preferredEnv)
    ) ??
    structure.services[0];
  if (!service) return otherPaths('services');
  const env = envFor(service, preferredEnv, structure);
  if (same && env === current.env) return current;
  return {
    view: 'services',
    service: service.segment,
    env,
    folder: same ? current.folder : ''
  };
};

// The whole environment when the service was removed or isn't in it.
// Without an environment, one the service is in, otherwise the whole last or
// first environment.
const validEnvironment = (
  current: EnvironmentLocation,
  { structure }: LocationContext,
  lastEnv: string | null
): Location => {
  const { environments } = structure;
  const service = current.service
    ? findService(structure, current.service)
    : undefined;
  if (findEnvironment(structure, current.env)) {
    if (!current.service || service?.environments.includes(current.env)) {
      return current;
    }
    return { ...current, service: null, folder: '' };
  }
  const env = service && envFor(service, lastEnv, structure);
  if (env) return { ...current, env };
  const fallback = findEnvironment(structure, lastEnv) ?? environments[0];
  if (!fallback) return otherPaths('environments');
  return placeIn('environments', fallback.segment, '', '');
};

// `location` if it's still valid, otherwise the nearest place that is: Paths
// when the structure is off, another service or environment when it was
// removed. Null is the default view's starting place.
export const validate = (
  location: Location | null,
  ctx: LocationContext,
  { defaultView, lastEnv }: Preferences
): Location => {
  const { structure } = ctx;
  if (!structure.enabled) {
    if (!location) return ALL_PARAMETERS;
    return convert(location, 'paths', ctx);
  }
  const current = location ?? initialLocation(defaultView);
  if (isServiceLocation(current)) return validService(current, ctx, lastEnv);
  if (isEnvironmentLocation(current)) {
    return validEnvironment(current, ctx, lastEnv);
  }
  return current;
};
