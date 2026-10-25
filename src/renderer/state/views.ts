// What the components show, derived from the parameters, the settings and the
// UI state.
import { useCallback, useEffect, useMemo } from 'react';
import {
  isServiceLocation,
  pathFolderOf,
  relativeFolder,
  rowsFor,
  serviceEnvironments,
  validate
} from '../utils/location';
import { compare } from '../utils/compare';
import { folderSet } from '../utils/newParameter';
import { buildFolderTree } from '../utils/paths';
import { createMatcher } from '../utils/search';
import {
  buildEnvironmentsTree,
  buildServicesTree
} from '../utils/servicesTree';
import { parse, pathOf, structureNames } from '../utils/structure';
import type { StructuredNames } from '../utils/structure';
import type { Location } from '../utils/location';
import type { Structure } from '../../shared/structure';
import { useParameters } from './parameters';
import type { ParameterEntry } from './parameters';
import {
  useLocationContext,
  usePathDelimiter,
  useSettingsStore
} from './settings';
import { uiActions, useUiStore } from './ui';

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

// What the table shows: the location and the search, in this profile and
// region. Checked rows belong to the context they were checked in, so
// changing any of these unchecks them.
export const useCheckContext = () => {
  const location = useLocation();
  const query = useUiStore(state => state.query);
  const profile = useSettingsStore(settings => settings.profile);
  const region = useSettingsStore(settings => settings.ssmRegion);
  return JSON.stringify([profile, region, location, query]);
};

// The checked rows' names, in table order. Use it once, in the component
// that owns the table: it also drops the checked rows of an old context, so
// they don't come back when the user returns to it.
export const useCheckedNames = () => {
  const context = useCheckContext();
  const checked = useUiStore(state => state.checked);
  const visible = useVisibleParameters();
  useEffect(() => {
    if (useUiStore.getState().checked.context !== context) {
      uiActions.clearChecked();
    }
  }, [context]);
  return useMemo(
    () =>
      checked.context === context
        ? visible.flatMap(p => (checked.names.has(p.Name) ? [p.Name] : []))
        : [],
    [checked, context, visible]
  );
};

// The names of every loaded parameter at a location, ignoring the search:
// what deleting a sidebar node's tree deletes.
export const useTreeNames = () => {
  const { parameters } = useParameters();
  const context = useLocationContext();
  return useCallback(
    (location: Location) =>
      rowsFor(location, parameters, context).map(p => p.Name),
    [parameters, context]
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

// Whether the main area compares the service's environments: only a
// service in the Services view does.
export const useCompareMode = () => {
  const compareOn = useUiStore(state => state.compare);
  const location = useLocation();
  return compareOn && isServiceLocation(location);
};

// Whether a comparison can be trusted: a load has finished for this profile
// and region. During the first one, names and values are still arriving, so
// keys would look missing or equal. A refresh keeps the previous list.
export const useComparisonReady = () => {
  const { syncedAt, loading } = useParameters();
  return !!syncedAt || !loading;
};

// The selected service's keys under the selected folder in each of its
// environments while comparing, otherwise null. Use it once, in the
// component that owns the main area: it compares every loaded parameter.
export const useComparison = () => {
  const { parameters, loading } = useParameters();
  const matcher = useMatcher();
  const location = useLocation();
  const context = useLocationContext();
  const compareMode = useCompareMode();
  return useMemo(
    () =>
      compareMode && isServiceLocation(location)
        ? compare(location, parameters, matcher, context, loading)
        : null,
    [compareMode, parameters, matcher, location, context, loading]
  );
};

// The Services view's sidebar. The selected service is counted in the
// environment on screen, the others in the one each would open on.
export const useServicesTree = () => {
  const matched = useMatchedParameters();
  const { query } = useMatcher();
  const location = useLocation();
  const lastEnv = useUiStore(state => state.lastEnv);
  const context = useLocationContext();
  const active = isServiceLocation(location) ? location : null;
  const preferredEnv = lastEnv ?? active?.env ?? null;
  return useMemo(
    () =>
      buildServicesTree(
        matched.map(p => p.Name),
        context,
        preferredEnv,
        !!query,
        active
      ),
    [matched, context, preferredEnv, query, active]
  );
};

// The Environments view's sidebar.
export const useEnvironmentsTree = () => {
  const matched = useMatchedParameters();
  const { query } = useMatcher();
  const context = useLocationContext();
  return useMemo(
    () =>
      buildEnvironmentsTree(
        matched.map(p => p.Name),
        context,
        !!query
      ),
    [matched, context, query]
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

// Every folder of the loaded parameters, for completing the new-parameter
// form's key or path.
export const useFolderSet = () => {
  const { byName } = useParameters();
  const delimiter = usePathDelimiter();
  return useMemo(
    () => folderSet(byName.keys(), delimiter),
    [byName, delimiter]
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

// 'current' is the parameter's own environment; 'missing' has no parameter
// with its key.
export type EnvironmentState = 'current' | 'exists' | 'missing';

// Where the parameter `name` is in the structure: its service, environment
// and key, and the parameter with its key in each environment of the
// service. Null with the structure off or for a name under Other paths.
export const useParameterPlace = (name: string) => {
  const { byName } = useParameters();
  const context = useLocationContext();
  return useMemo(() => {
    const { structure, delimiter } = context;
    const match = parse(name, structure, delimiter);
    const service =
      match && structure.services.find(s => s.segment === match.service);
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
          : byName.has(path)
            ? 'exists'
            : 'missing';
      return { ...env, name: path, state };
    });
    const color = environments.find(e => e.state === 'current')!.color;
    return { ...match, color, environments };
  }, [name, byName, context]);
};
