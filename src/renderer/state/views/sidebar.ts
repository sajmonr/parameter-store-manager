// The sidebar trees and the folders of the loaded parameters.
import { useMemo } from 'react';
import { isServiceLocation } from '../../utils/location';
import { buildFolderTree, folderSet } from '../../utils/paths';
import {
  buildEnvironmentsTree,
  buildServicesTree
} from '../../utils/servicesTree';
import { useParameters } from '../parameters';
import { useLocationContext, usePathDelimiter } from '../settings';
import { useUiStore } from '../ui';
import { useLocation, useMatchedParameters, useMatcher } from './location';

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
