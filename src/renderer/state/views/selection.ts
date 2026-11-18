// The checked and selected rows.
import { useEffect, useMemo } from 'react';
import { useParameters } from '../parameters';
import { useSettingsStore } from '../settings';
import { uiActions, useUiStore } from '../ui';
import { useLocation, useVisibleParameters } from './location';

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
