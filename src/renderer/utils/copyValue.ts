// Copying one parameter's value to its key in other environments of the
// same service. Only the value is copied: each target keeps its type,
// description and KMS key.
import {
  PARAMETER_TYPE,
  isEditableType,
  isSecure,
  isSecureType
} from '../../shared/parameterTypes';
import type { PutParameterRequest } from '../../main/endpoints/parameters/putParameter/putParameter.contract';
import type { ParameterEntry } from './parameterList';
import { plural } from './plural';

// 'new' has no parameter with the key yet; 'same' already has the value.
export type CopyStatus = 'new' | 'overwrites' | 'same';

export interface CopyTarget {
  segment: string;
  color: string;
  // The key's name in this environment.
  name: string;
  // The parameter there, if there is one.
  parameter: ParameterEntry | undefined;
  status: CopyStatus;
}

export interface CopyEnvironment {
  segment: string;
  color: string;
  name: string;
  state: 'current' | 'exists' | 'missing';
}

// Every environment but the source's, in the given order. Values are
// compared as loaded, decrypted; a value that didn't load is never the same.
export const copyTargets = (
  source: ParameterEntry,
  environments: CopyEnvironment[],
  byName: ReadonlyMap<string, ParameterEntry>
): CopyTarget[] =>
  environments
    .filter(env => env.state !== 'current')
    .map(({ segment, color, name }) => {
      const parameter = byName.get(name);
      let status: CopyStatus = 'new';
      if (parameter) {
        status =
          parameter.Value !== undefined &&
          source.Value !== undefined &&
          parameter.Value === source.Value
            ? 'same'
            : 'overwrites';
      }
      return { segment, color, name, parameter, status };
    });

// Whether a copy to `target` encrypts a String's value: the target exists
// as a SecureString and keeps its type.
export const isEncrypted = (source: ParameterEntry, target: CopyTarget) =>
  source.Type === PARAMETER_TYPE.String && isSecureType(target.parameter?.Type);

// Whether a copy to `target` saves a SecureString unencrypted: the target
// exists as a String or a StringList, and keeps its type.
export const isUnencrypted = (source: ParameterEntry, target: CopyTarget) =>
  isSecure(source) && !!target.parameter && !isSecure(target.parameter);

// The save for one target. A new parameter gets the source's type, with
// `kmsKey` for a SecureString, and no description. An existing one is
// overwritten with its own type and KMS key, and keeps its description.
// Throws for a source type the app can't save, such as StringList.
export const copyRequest = (
  source: ParameterEntry,
  target: CopyTarget,
  kmsKey: string | undefined
): PutParameterRequest => {
  if (!isEditableType(source.Type)) {
    throw new Error(`${source.Type} values can't be copied yet`);
  }
  const value = source.Value ?? '';
  const { parameter } = target;
  if (!parameter) {
    const type = source.Type;
    return {
      name: target.name,
      type,
      value,
      ...(isSecureType(type) && { kmsKey }),
      overwrite: false
    };
  }
  const type = isEditableType(parameter.Type) ? parameter.Type : undefined;
  return {
    name: target.name,
    ...(type && { type }),
    ...(isSecureType(type) && { kmsKey: parameter.KeyId }),
    value,
    overwrite: true
  };
};

// What copying to `targets` does: "2 new · 1 overwrite · 1 unencrypted".
export const copySummary = (source: ParameterEntry, targets: CopyTarget[]) => {
  const created = targets.filter(t => t.status === 'new').length;
  const overwrites = targets.filter(t => t.status === 'overwrites').length;
  const unencrypted = targets.filter(t => isUnencrypted(source, t)).length;
  const parts = [
    created && `${created} new`,
    overwrites && plural(overwrites, 'overwrite'),
    unencrypted && `${unencrypted} unencrypted`
  ].filter(Boolean);
  return { text: parts.join(' · '), overwrites };
};

// An environment the value can be copied from: one that has the key, with
// its type there. A type the app can't save is listed but can't be picked.
export interface SourceEnvironment {
  segment: string;
  color: string;
  name: string;
  type: string | undefined;
}

export const sourceEnvironments = (
  environments: CopyEnvironment[],
  byName: ReadonlyMap<string, ParameterEntry>
): SourceEnvironment[] =>
  environments.flatMap(({ segment, color, name, state }) =>
    state === 'missing'
      ? []
      : [{ segment, color, name, type: byName.get(name)?.Type }]
  );

// With more targets than this, the list can be filtered.
export const FILTER_THRESHOLD = 5;

// The targets whose environment contains the filter text, ignoring case.
// Short lists aren't filtered.
export const filterTargets = (targets: CopyTarget[], filter: string) => {
  const filtering = targets.length > FILTER_THRESHOLD;
  const query = filtering ? filter.trim().toLowerCase() : '';
  return {
    filtering,
    listed: targets.filter(t => t.segment.toLowerCase().includes(query))
  };
};

// The targets that can be picked, and the picked ones among them: a target
// that got the value since it was picked is no longer selected.
export const selectionOf = (
  targets: CopyTarget[],
  picked: ReadonlySet<string>
) => {
  const selectable = targets.filter(t => t.status !== 'same');
  return {
    selectable,
    selected: selectable.filter(t => picked.has(t.segment))
  };
};

// The "Select all" checkbox over the listed targets.
export const selectAllState = (
  listed: CopyTarget[],
  picked: ReadonlySet<string>
) => {
  const { selectable, selected } = selectionOf(listed, picked);
  return {
    selectable,
    checked: selectable.length > 0 && selected.length === selectable.length,
    indeterminate: selected.length > 0 && selected.length < selectable.length
  };
};

// The copy button: the copy under way, or how many it copies to.
export const copyButtonLabel = (
  progress: { done: number; total: number } | undefined,
  count: number
) => {
  if (progress) {
    return `Copying ${Math.min(progress.done + 1, progress.total)} of ${progress.total}…`;
  }
  return count ? `Copy to ${plural(count, 'environment')}` : 'Copy';
};
