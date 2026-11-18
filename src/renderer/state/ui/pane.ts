// The detail pane, the checked rows, compare mode and revealed values.
import type { CompareFilter } from '../../utils/compare';
import { toggleIn } from '../../utils/sets';
import { get, initialUiState, set } from './store';
import type { NewParameterPrefill } from './types';

export const selectParameter = (selectedName: string) =>
  set({ selectedName, paneMode: 'detail', newPrefill: null });

// `prefill` when duplicating, or null for a blank form.
export const openNewParameter = (
  newPrefill: NewParameterPrefill | null = null
) => set({ paneMode: 'new', newPrefill });

export const closePane = () =>
  set({ selectedName: null, paneMode: null, newPrefill: null });

export const setChecked = (context: string, names: Iterable<string>) =>
  set({ checked: { context, names: new Set(names) } });

export const clearChecked = () => set({ checked: initialUiState.checked });

// Switching between the table and the comparison unchecks the rows.
export const setCompare = (compare: boolean) => {
  if (compare === get().compare) return;
  set({ compare, checked: initialUiState.checked });
};

export const setCompareFilter = (compareFilter: CompareFilter) =>
  set({ compareFilter });

// Masks every SecureString again: another profile or region can have a
// parameter with the same name.
export const clearRevealed = () => set({ revealed: initialUiState.revealed });

export const toggleReveal = (name: string) =>
  set(state => ({ revealed: toggleIn(state.revealed, name) }));
