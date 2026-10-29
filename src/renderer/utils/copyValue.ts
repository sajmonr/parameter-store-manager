// Copying one parameter's value to its key in other environments of the
// same service. Only the value is copied: each target keeps its type,
// description and KMS key.
import { isEditableType } from '../../main/endpoints/parameters/putParameter/putParameter.contract';
import type { PutParameterRequest } from '../../main/endpoints/parameters/putParameter/putParameter.contract';
import type { ParameterEntry } from '../state/parameters';
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

// Whether a copy to `target` saves a SecureString unencrypted: the target
// exists as a String or a StringList, and keeps its type.
export const isUnencrypted = (source: ParameterEntry, target: CopyTarget) =>
  source.Type === 'SecureString' &&
  !!target.parameter &&
  target.parameter.Type !== 'SecureString';

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
      ...(type === 'SecureString' && { kmsKey }),
      overwrite: false
    };
  }
  const type = isEditableType(parameter.Type) ? parameter.Type : undefined;
  return {
    name: target.name,
    ...(type && { type }),
    ...(type === 'SecureString' && { kmsKey: parameter.KeyId }),
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
