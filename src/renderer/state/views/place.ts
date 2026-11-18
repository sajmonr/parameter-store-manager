// Where parameters sit in the structure.
import { useMemo } from 'react';
import { copyTargets } from '../../utils/copyValue';
import { parameterPlace } from '../../utils/parameterPlace';
import { structureNames } from '../../utils/structure';
import type { StructuredNames } from '../../utils/structure';
import type { ParameterEntry } from '../../utils/parameterList';
import type { Structure } from '../../../shared/structure';
import { useParameters } from '../parameters';
import {
  useLocationContext,
  usePathDelimiter,
  useSettingsStore
} from '../settings';

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

// Where the parameter `name` is in the structure (see parameterPlace).
export const useParameterPlace = (name: string) => {
  const { byName } = useParameters();
  const context = useLocationContext();
  return useMemo(
    () => parameterPlace(name, byName, context),
    [name, byName, context]
  );
};

// The other environments of `name`'s service, with what copying its value
// to each would do. Null when it can't be copied: it isn't loaded, it's
// under Other paths, or its service has only one environment.
export const useCopyTargets = (name: string) => {
  const { byName } = useParameters();
  const place = useParameterPlace(name);
  const source = byName.get(name);
  return useMemo(() => {
    if (!source || !place || place.environments.length < 2) return null;
    return {
      source,
      place,
      targets: copyTargets(source, place.environments, byName)
    };
  }, [source, place, byName]);
};
