// UI state shared by the header, folder tree, table and detail pane.
import type { EditableParameterType } from '../../../shared/parameterTypes';
import type { CompareFilter } from '../../utils/compare';
import type { Location, LocationView } from '../../utils/location';

export type PaneMode = 'detail' | 'new';

export type Page = 'parameters' | 'importExport' | 'settings';

export type SettingsSection = 'aws' | 'services' | 'display';

// The new-parameter form's starting values: when duplicating, or when
// setting a key that's missing in an environment.
export interface NewParameterPrefill {
  // The duplicated parameter; the form starts on its name with 'Copy' added.
  source?: string;
  // The name to create instead, as a service, environment and key.
  target?: { service: string; env: string; key: string };
  description?: string;
  type?: EditableParameterType;
  kmsKey?: string;
  value?: string;
  // The value field gets the focus.
  focusValue?: boolean;
}

// The copy dialog's starting point.
export interface CopyRequest {
  // Tells apart two openings for the same parameter.
  id: number;
  // The parameter whose value is copied; the user can pick another
  // environment's.
  source: string;
  // The environments ticked from the start.
  preselectTargets: string[];
  // The user is asked to check the source: opened to fill a missing value.
  pickSource: boolean;
}

// Parameters waiting for the delete confirmation: the checked rows, a
// sidebar node's tree (`label` is its path) or the open parameter (`label` is
// its name).
export interface DeleteRequest {
  kind: 'selection' | 'tree' | 'parameter';
  label: string;
  names: string[];
}

export interface Checked {
  // The table context they were checked in (see views.useCheckContext).
  // In any other context, no rows are checked.
  context: string;
  names: ReadonlySet<string>;
}

export interface UiState {
  page: Page;
  // Where the parameter list is, as last set; null until then, which is the
  // default view's starting place. It can point at a service that was since
  // removed, so it is read through getLocation or useLocation.
  location: Location | null;
  // The environment last picked in a grouped view. Other services open on
  // it when they are in it.
  lastEnv: string | null;
  query: string;
  // The expanded tree nodes of each view.
  expanded: Record<LocationView, string[]>;
  selectedName: string | null;
  // The table rows checked for bulk actions, by full name.
  checked: Checked;
  // Whether a service shows its environments side by side instead of one
  // environment's table. Kept while moving around the Services view; only
  // a service shows it (see views.useCompareMode).
  compare: boolean;
  compareFilter: CompareFilter;
  // The SecureStrings shown unmasked in the table and the compare grid.
  revealed: ReadonlySet<string>;
  pendingDelete: DeleteRequest | null;
  // null while the copy dialog is closed.
  copyRequest: CopyRequest | null;
  // null while the pane is closed.
  paneMode: PaneMode | null;
  newPrefill: NewParameterPrefill | null;
  // The section the Settings page shows; kept while the page is hidden.
  settingsSection: SettingsSection;
}
