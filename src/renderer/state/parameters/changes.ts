// Names created or deleted in the app while a load runs, per profile and
// region. The loaded list is older than these changes, so they are applied on
// top of it.
import type { ParametersKey } from './key';

export interface Changes {
  created: Set<string>;
  deleted: Set<string>;
}

const changesDuringLoad = new Map<string, Changes>();

const keyId = (key: ParametersKey) => JSON.stringify(key);

// Starts recording for a load of `key`, replacing an older load's record.
export const trackChanges = (key: ParametersKey) => {
  const changes: Changes = { created: new Set(), deleted: new Set() };
  changesDuringLoad.set(keyId(key), changes);
  return changes;
};

export const recordChange = (
  key: ParametersKey,
  name: string,
  change: 'created' | 'deleted'
) => {
  const changes = changesDuringLoad.get(keyId(key));
  if (!changes) return;
  changes[change].add(name);
  changes[change === 'created' ? 'deleted' : 'created'].delete(name);
};
