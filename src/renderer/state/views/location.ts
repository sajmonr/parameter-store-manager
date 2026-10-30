// Where the user is, and what the table lists there.
import { useCallback, useMemo } from 'react';
import {
  pathFolderOf,
  relativeFolder,
  rowsFor,
  validate
} from '../../utils/location';
import type { Location } from '../../utils/location';
import { createMatcher } from '../../utils/search';
import { useParameters } from '../parameters';
import {
  useLocationContext,
  usePathDelimiter,
  useSettingsStore
} from '../settings';
import { useUiStore } from '../ui';

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
