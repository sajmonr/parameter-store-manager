// The environment tabs and the comparison of a service's environments.
import { useMemo } from 'react';
import { compare } from '../../utils/compare';
import { isServiceLocation, rowsFor } from '../../utils/location';
import { environmentsOf } from '../../utils/structure';
import { useParameters } from '../parameters';
import { useLocationContext } from '../settings';
import { useUiStore } from '../ui';
import { useLocation, useMatchedParameters, useMatcher } from './location';

// The environment tabs of the selected service, with the matching
// parameters in each at the selected folder. Empty outside a service.
export const useEnvironmentTabs = () => {
  const matched = useMatchedParameters();
  const location = useLocation();
  const context = useLocationContext();
  return useMemo(() => {
    if (!isServiceLocation(location)) return [];
    return environmentsOf(location.service, context.structure).map(env => ({
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

// Whether a load has finished for this profile and region. During the first
// one, names and values are still arriving: counts would keep rolling and a
// comparison would see keys as missing or equal. A refresh keeps the
// previous list, so it stays loaded.
export const useLoaded = () => {
  const { syncedAt, loading } = useParameters();
  return !!syncedAt || !loading;
};

// Whether a load has succeeded for this profile and region, so every name
// is listed. Unlike useLoaded, a first load that failed partway doesn't
// count: its list is missing whole pages, and a comparison would report
// their keys as missing.
export const useListComplete = () => !!useParameters().syncedAt;

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
