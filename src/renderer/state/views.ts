// What the components show, derived from the parameters, the settings and the
// UI state.
import { useMemo } from 'react';
import { buildFolderTree } from '../utils/paths';
import { createMatcher } from '../utils/search';
import { structureNames } from '../utils/structure';
import type { StructuredNames } from '../utils/structure';
import type { Structure } from '../../shared/structure';
import { useParameters } from './parameters';
import type { ParameterEntry } from './parameters';
import { usePathDelimiter, useSettingsStore } from './settings';
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
