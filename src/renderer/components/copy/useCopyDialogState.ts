import { useState } from 'react';
import {
  DEFAULT_KMS_KEY,
  isEditableType
} from '../../../shared/parameterTypes';
import { useCopyValue } from '../../state/parameters';
import { usePathDelimiter } from '../../state/settings';
import { uiActions } from '../../state/ui';
import type { useCopyTargets } from '../../state/views';
import {
  copyButtonLabel,
  copyRequest,
  copySummary,
  filterTargets,
  selectAllState,
  selectionOf
} from '../../utils/copyValue';
import type { CopyTarget } from '../../utils/copyValue';
import { notifySuccess } from '../../utils/notify';
import { leafOf } from '../../utils/paths';
import { plural } from '../../utils/plural';
import { toggleIn } from '../../utils/sets';

export type Copyable = NonNullable<ReturnType<typeof useCopyTargets>>;

export interface Outcome {
  copied: number;
  total: number;
  // The targets that failed, to retry.
  failed: CopyTarget[];
}

// The copy dialog's selection, KMS keys, filter and the copy itself.
// `setName` changes the source parameter.
const useCopyDialogState = (
  { source, place, targets }: Copyable,
  preselectTargets: string[],
  setName: (name: string) => void
) => {
  const delimiter = usePathDelimiter();
  const copyValue = useCopyValue();
  const [picked, setPicked] = useState<ReadonlySet<string>>(
    () => new Set(preselectTargets)
  );
  // A Map, not an object: an environment may be named `constructor`.
  const [kmsKeys, setKmsKeys] = useState<ReadonlyMap<string, string>>(
    new Map()
  );
  const [filter, setFilter] = useState('');
  const [errors, setErrors] = useState<ReadonlyMap<string, string>>(new Map());
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const [progress, setProgress] = useState<{ done: number; total: number }>();
  const copying = copyValue.isPending;

  const canCopy = isEditableType(source.Type) && source.Value !== undefined;
  const defaultKey = source.KeyId ?? DEFAULT_KMS_KEY;
  const { selectable, selected } = selectionOf(targets, picked);
  const { filtering, listed } = filterTargets(targets, filter);
  const allState = selectAllState(listed, picked);
  const kmsKeyOf = (target: CopyTarget) =>
    kmsKeys.get(target.segment) ?? defaultKey;

  // Another environment's value: the old source becomes a target, the new
  // one isn't, and the key defaults follow the new source's key.
  const changeSource = (next: string) => {
    const env = place.environments.find(e => e.name === next);
    if (!env || next === source.Name) return;
    setName(next);
    setPicked(current => {
      const without = new Set(current);
      without.delete(env.segment);
      return without;
    });
    setKmsKeys(new Map());
    setErrors(new Map());
    setOutcome(null);
  };

  const toggle = (segment: string) =>
    setPicked(current => toggleIn(current, segment));

  const selectAll = (checked: boolean) =>
    setPicked(current => {
      const next = new Set(current);
      allState.selectable.forEach(t =>
        checked ? next.add(t.segment) : next.delete(t.segment)
      );
      return next;
    });

  const setKmsKey = (segment: string, key: string) =>
    setKmsKeys(current => new Map(current).set(segment, key));

  const copy = async (rows: CopyTarget[]) => {
    if (!rows.length || !canCopy) return;
    setErrors(new Map());
    setOutcome(null);
    setProgress({ done: 0, total: rows.length });
    const result = await copyValue.mutateAsync({
      requests: rows.map(target =>
        copyRequest(source, target, kmsKeyOf(target))
      ),
      onDone: () =>
        setProgress(
          current => current && { ...current, done: current.done + 1 }
        )
    });
    setProgress(undefined);

    const failed = rows.filter(t => result.failed.has(t.name));
    if (!failed.length) {
      notifySuccess(`Copied to ${plural(rows.length, 'environment')}`, {
        description: `${leafOf(source.Name, delimiter)} → ${rows.map(t => t.segment).join(', ')}`
      });
      uiActions.closeCopy();
      return;
    }
    setPicked(new Set(failed.map(t => t.segment)));
    setErrors(
      new Map(failed.map(t => [t.segment, result.failed.get(t.name)!]))
    );
    setOutcome({ copied: result.copied.length, total: rows.length, failed });
  };

  return {
    copying,
    canCopy,
    picked,
    selectable,
    selected,
    filter,
    setFilter,
    filtering,
    listed,
    allState,
    errors,
    outcome,
    summary: copySummary(source, selected),
    okText: copyButtonLabel(progress, selected.length),
    kmsKeyOf,
    setKmsKey,
    changeSource,
    toggle,
    selectAll,
    copy
  };
};

export default useCopyDialogState;
