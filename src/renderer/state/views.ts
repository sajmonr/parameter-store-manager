// What the components show, derived from the parameters, the settings and the
// UI state.
import { useMemo } from 'react';
import {
  isServiceLocation,
  pathFolderOf,
  relativeFolder,
  rowsFor,
  serviceEnvironments,
  validate
} from '../utils/location';
import { buildFolderTree } from '../utils/paths';
import { createMatcher } from '../utils/search';
import { buildServicesTree } from '../utils/servicesTree';
import { structureNames } from '../utils/structure';
import type { StructuredNames } from '../utils/structure';
import type { Structure } from '../../shared/structure';
import { useParameters } from './parameters';
import type { ParameterEntry } from './parameters';
import {
  useLocationContext,
  usePathDelimiter,
  useSettingsStore
} from './settings';
import { useUiStore } from './ui';

export const useMatcher = () => {
  const query = useUiStore(state => state.query);
  const delimiter = usePathDelimiter();
  return useMemo(() => createMatcher(query, delimiter), [query, delimiter]);
};

// Parameters that match the search, in any folder.
export const useMatchedParameters = () => {
  const { parameters } = useParameters();
  const matcher = useMatcher();
  return useMemo(
    () => parameters.filter(p => matcher.test(p.Name)),
    [parameters, matcher]
  );
};

// The location, made valid for the current settings (see ui.getLocation).
export const useLocation = () => {
  const location = useUiStore(state => state.location);
  const lastEnv = useUiStore(state => state.lastEnv);
  const defaultView = useSettingsStore(settings => settings.defaultView);
  const context = useLocationContext();
  return useMemo(
    () => validate(location, context, { defaultView, lastEnv }),
    [location, context, defaultView, lastEnv]
  );
};

// The full folder of the location: '' for all parameters.
export const useLocationPath = () => {
  const location = useLocation();
  const context = useLocationContext();
  return pathFolderOf(location, context);
};

// Parameters that match the search and are at the location: the table rows.
export const useVisibleParameters = () => {
  const matched = useMatchedParameters();
  const location = useLocation();
  const context = useLocationContext();
  return useMemo(
    () => rowsFor(location, matched, context),
    [matched, location, context]
  );
};

// The folder a row shows below its name, relative to the location's folder.
export const useRelativeFolder = (name: string) => {
  const location = useLocation();
  const context = useLocationContext();
  return relativeFolder(location, name, context);
};

// The environment tabs of the selected service, with the matching
// parameters in each at the selected folder. Empty outside a service.
export const useEnvironmentTabs = () => {
  const matched = useMatchedParameters();
  const location = useLocation();
  const context = useLocationContext();
  return useMemo(() => {
    if (!isServiceLocation(location)) return [];
    const service = context.structure.services.find(
      s => s.segment === location.service
    );
    if (!service) return [];
    return serviceEnvironments(service, context.structure).map(env => ({
      ...env,
      count: rowsFor({ ...location, env: env.segment }, matched, context).length
    }));
  }, [matched, location, context]);
};

// The Services view's sidebar, with the matches counted in the environment
// each service would open on.
export const useServicesTree = () => {
  const matched = useMatchedParameters();
  const { query } = useMatcher();
  const location = useLocation();
  const lastEnv = useUiStore(state => state.lastEnv);
  const context = useLocationContext();
  const preferredEnv =
    lastEnv ?? (isServiceLocation(location) ? location.env : null);
  return useMemo(
    () =>
      buildServicesTree(
        matched.map(p => p.Name),
        context,
        preferredEnv,
        !!query
      ),
    [matched, context, preferredEnv, query]
  );
};

// The sidebar tree shows where matches are, so it ignores the scope.
export const useMatchedFolderTree = () => {
  const matched = useMatchedParameters();
  const delimiter = usePathDelimiter();
  return useMemo(
    () =>
      buildFolderTree(
        matched.map(p => p.Name),
        delimiter
      ),
    [matched, delimiter]
  );
};

// Every folder, for the folder picker in the new-parameter form.
export const useAllFolderTree = () => {
  const { parameters } = useParameters();
  const delimiter = usePathDelimiter();
  return useMemo(
    () =>
      buildFolderTree(
        parameters.map(p => p.Name),
        delimiter
      ),
    [parameters, delimiter]
  );
};

// The loaded parameters are read with the structure once, not once per
// component. The settings are replaced on every change, so the structure is
// compared by value.
let lastStructured: {
  parameters: ParameterEntry[];
  config: string;
  result: StructuredNames;
} | null = null;

const structuredParameters = (
  parameters: ParameterEntry[],
  structure: Structure,
  delimiter: string
) => {
  const config = JSON.stringify([structure, delimiter]);
  if (
    lastStructured?.parameters !== parameters ||
    lastStructured.config !== config
  ) {
    const names = parameters.map(p => p.Name);
    const result = structureNames(names, structure, delimiter);
    lastStructured = { parameters, config, result };
  }
  return lastStructured.result;
};

// Every loaded parameter's service and environment, and the counts per
// service and environment, ignoring the search.
export const useStructuredParameters = () => {
  const { parameters } = useParameters();
  const structure = useSettingsStore(settings => settings.structure);
  const delimiter = usePathDelimiter();
  return structuredParameters(parameters, structure, delimiter);
};

export const useNameSet = () => {
  const { byName } = useParameters();
  return useMemo(() => new Set(byName.keys()), [byName]);
};

// The selected parameter with its value, or null if it no longer exists.
export const useSelectedParameter = () => {
  const name = useUiStore(state => state.selectedName);
  const { byName } = useParameters();
  return (name && byName.get(name)) || null;
};
