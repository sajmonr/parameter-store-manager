import { useMemo, useState } from 'react';
import type { FormatId } from '../../../../shared/fileFormats';
import { exportActions, useExportStore } from '../../../state/export';
import { useParameters } from '../../../state/parameters';
import { usePathDelimiter } from '../../../state/settings';
import { useAllFolderTree, useLocationPath } from '../../../state/views';
import useDebouncedValue from '../../../hooks/useDebouncedValue';
import usePageVisible from '../../../hooks/usePageVisible';
import { exportsType } from '../../../utils/exportRows';
import { formatById } from '../../../utils/formats';
import { WAITING_FOR_PARAMETERS } from '../../../utils/labels';
import { describeExportProgress } from '../../../utils/progress';
import {
  createPathMatcher,
  globUnder,
  suggestFolders
} from '../../../utils/search';

export type Scope = 'all' | 'path';

// The count waits until typing pauses, so it doesn't flicker.
const COUNT_DEBOUNCE_MS = 250;

// The export page's choices, and what they would export. Each time the page
// is shown, the scope starts over from the current folder, unless an export
// is running. The format stays the last one used.
const useExportForm = () => {
  const { parameters, loading } = useParameters();
  const { keys: folders } = useAllFolderTree();
  const delimiter = usePathDelimiter();
  const initialPath = globUnder(useLocationPath(), delimiter);
  const visible = usePageVisible();
  const exporting = useExportStore(state => state.running);
  const progress = useExportStore(state => state.progress);

  const [formatId, setFormatId] = useState<FormatId>('csv');
  const [scope, setScope] = useState<Scope>('path');
  const [path, setPath] = useState(initialPath);
  const [includeSecureValues, setIncludeSecureValues] = useState(false);
  const debouncedPath = useDebouncedValue(path, COUNT_DEBOUNCE_MS);
  const byPath = scope === 'path';
  const typing = byPath && path !== debouncedPath;

  const [wasVisible, setWasVisible] = useState(visible);
  if (visible !== wasVisible) {
    setWasVisible(visible);
    if (visible && !exporting) {
      setScope('path');
      setPath(initialPath);
      setIncludeSecureValues(false);
    }
  }

  const exportable = useMemo(
    () => parameters.filter(p => exportsType(formatId, p.Type)),
    [formatId, parameters]
  );
  const matched = useMemo(() => {
    const matcher = createPathMatcher(debouncedPath, delimiter);
    return exportable.filter(p => matcher.test(p.Name));
  }, [debouncedPath, delimiter, exportable]);
  const selected = byPath ? matched : exportable;

  const suggestions = useMemo(
    () => suggestFolders(folders, path, delimiter),
    [folders, path, delimiter]
  );

  const pathMissing = byPath && !path.trim();
  const canExport =
    !exporting && !loading && !typing && !pathMissing && selected.length > 0;

  let status: string | null = null;
  if (progress) status = describeExportProgress(progress);
  else if (loading) status = WAITING_FOR_PARAMETERS;
  else if (typing) status = 'Counting…';

  const start = () =>
    exportActions.start({
      format: formatId,
      path: byPath ? path.trim() : '',
      includeSecureValues
    });

  return {
    format: formatById(formatId),
    setFormatId,
    scope,
    setScope,
    path,
    setPath,
    includeSecureValues,
    setIncludeSecureValues,
    exportable,
    matched,
    selected,
    suggestions,
    // The count is shown once it is settled.
    counted: !loading && !typing && !pathMissing,
    canExport,
    exporting,
    progress,
    status,
    start
  };
};

export default useExportForm;
