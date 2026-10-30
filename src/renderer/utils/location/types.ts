// Where the parameter list is: a folder in the Paths view, a service,
// environment and folder in the Services view, an environment (and maybe a
// service and folder) in the Environments view, or a folder of Other paths
// in either grouped view.
import type { Structure } from '../../../shared/structure';

export interface PathsLocation {
  view: 'paths';
  // Folder path ending in the delimiter; '' means all parameters.
  scope: string;
}

export interface ServiceLocation {
  view: 'services';
  // '' until validate picks one.
  service: string;
  // '' when the service has no environments, or until validate picks one.
  env: string;
  // A folder of the key: 'AppServer/' or '' for the whole service.
  folder: string;
}

export interface EnvironmentLocation {
  view: 'environments';
  // '' until validate picks one.
  env: string;
  // Null for the whole environment.
  service: string | null;
  // A folder of the key: 'AppServer/' or '' for the whole service. Always ''
  // for the whole environment.
  folder: string;
}

// The views that group by service and environment.
export type GroupedView = 'services' | 'environments';

export interface OtherLocation {
  view: GroupedView;
  other: true;
  // A full folder path, or '' for all of Other paths.
  folder: string;
}

export type Location =
  PathsLocation | ServiceLocation | EnvironmentLocation | OtherLocation;

export type LocationView = Location['view'];

export interface LocationContext {
  structure: Structure;
  delimiter: string;
}

export const isOtherLocation = (
  location: Location
): location is OtherLocation => 'other' in location;

export const isServiceLocation = (
  location: Location
): location is ServiceLocation =>
  location.view === 'services' && !isOtherLocation(location);

export const isEnvironmentLocation = (
  location: Location
): location is EnvironmentLocation =>
  location.view === 'environments' && !isOtherLocation(location);

// The Environments view with no service picked: grouped by service.
export const isWholeEnvironment = (location: Location) =>
  isEnvironmentLocation(location) && location.service === null;

export const ALL_PARAMETERS: PathsLocation = { view: 'paths', scope: '' };

export const otherPaths = (view: GroupedView, folder = ''): OtherLocation => ({
  view,
  other: true,
  folder
});

// A folder of a service's keys in an environment, in a grouped view. An
// empty service is none: the whole environment.
export const placeIn = (
  view: GroupedView,
  env: string,
  service: string,
  folder: string
): Location =>
  view === 'services'
    ? { view, service, env, folder }
    : { view, env, service: service || null, folder: service ? folder : '' };
