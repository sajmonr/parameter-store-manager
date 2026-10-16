// What the components show, derived from the parameters, the settings and the
// UI state.
import { useMemo } from 'react';
import { buildFolderTree } from '../utils/paths';
import { createMatcher } from '../utils/search';
import { useParameters } from './parameters';
import { usePathDelimiter } from './settings';
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

// Parameters that match the search and sit in the scoped folder.
export const useVisibleParameters = () => {
  const matched = useMatchedParameters();
  const scope = useUiStore(state => state.scope);
  return useMemo(
    () => (scope ? matched.filter(p => p.Name.startsWith(scope)) : matched),
    [matched, scope]
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
