// How the review shows each import status.
import type { ImportStatus } from '../../../utils/importPlan';

interface StatusStyle {
  label: string;
  color?: string;
  // Explains a status that isn't obvious.
  tooltip?: string;
}

export const STATUSES: Record<ImportStatus, StatusStyle> = {
  new: { label: 'new', color: 'green' },
  changed: { label: 'changed', color: 'gold' },
  unchanged: { label: 'unchanged' },
  skipped: {
    label: 'skipped',
    tooltip: 'Exported without decryption, so the file has no value.'
  },
  typeChange: {
    label: 'type change',
    tooltip:
      "It exists with another type. Changing between String and SecureString isn't supported yet."
  },
  unsupported: {
    label: 'unsupported',
    tooltip: "StringList parameters can't be imported yet."
  }
};

// The statuses counted in the stats row; the last three only when present.
export const STAT_ORDER: ImportStatus[] = [
  'new',
  'changed',
  'unchanged',
  'skipped',
  'typeChange',
  'unsupported'
];
export const ALWAYS_COUNTED = new Set<ImportStatus>([
  'new',
  'changed',
  'unchanged'
]);
