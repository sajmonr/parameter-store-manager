// User-facing words used in more than one place, so they read the same
// everywhere.
import { PARAMETER_VIEWS } from '../../shared/structure';
import type { ParameterView } from '../../shared/structure';

export const VIEW_LABELS: Record<ParameterView, string> = {
  services: 'Services',
  environments: 'Environments',
  paths: 'Paths'
};

export const viewOptions = PARAMETER_VIEWS.map(view => ({
  value: view,
  label: VIEW_LABELS[view]
}));

// Names whose path doesn't match the structure.
export const OTHER_PATHS_LABEL = 'Other paths';

// The node for all of Other paths, under its heading in the sidebar.
export const OTHER_PATHS_ROOT_LABEL = 'Root';

// An environment without the key.
export const NOT_SET_LABEL = 'Not set';

export const KMS_KEY_LABEL = 'KMS key';

export const DESCRIPTION_PLACEHOLDER = 'What reads this value?';

// A count that isn't known until the parameters load.
export const COUNT_PLACEHOLDER = '–';

// A field with nothing to show.
export const EMPTY_VALUE = '—';

export const WAITING_FOR_PARAMETERS =
  'Waiting for parameters to finish loading…';
