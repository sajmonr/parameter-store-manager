// The delete confirmation and the copy dialog.
import { closePane, setChecked } from './pane';
import { get, set } from './store';
import type { DeleteRequest } from './types';

// Opens the delete confirmation.
export const requestDelete = (pendingDelete: DeleteRequest) =>
  set({ pendingDelete });

export const cancelDelete = () => set({ pendingDelete: null });

// Closes the confirmation after a delete. The names that failed stay checked,
// and the pane closes if it showed a deleted parameter.
export const finishDelete = (
  context: string,
  { deleted, failed }: { deleted: string[]; failed: string[] }
) => {
  const { selectedName, paneMode } = get();
  setChecked(context, failed);
  set({ pendingDelete: null });
  if (paneMode === 'detail' && selectedName && deleted.includes(selectedName)) {
    closePane();
  }
};

let copyRequests = 0;

// Opens the dialog that copies a parameter's value to other environments
// of its service.
export const openCopyDialog = (
  sourceName: string,
  {
    preselectTargets = [],
    pickSource = false
  }: { preselectTargets?: string[]; pickSource?: boolean } = {}
) => {
  copyRequests += 1;
  set({
    copyRequest: {
      id: copyRequests,
      source: sourceName,
      preselectTargets,
      pickSource
    }
  });
};

export const closeCopy = () => set({ copyRequest: null });
