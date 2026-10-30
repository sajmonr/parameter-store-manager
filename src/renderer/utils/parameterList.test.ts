import { describe, expect, it } from 'vitest';
import {
  EMPTY_LIST,
  loadStateOf,
  settleLoad,
  sortedParameters,
  withMetadata,
  withPut,
  withValues,
  without
} from './parameterList';
import type { ParameterList } from './parameterList';

const listOf = (...names: string[]): ParameterList => ({
  byName: new Map(names.map(Name => [Name, { Name, Type: 'String' }])),
  syncedAt: null
});

describe('withMetadata', () => {
  it('keeps a loaded value but replaces the metadata', () => {
    const list = withValues(
      withMetadata(EMPTY_LIST, [{ Name: 'a', Description: 'old' }], new Set()),
      [{ Name: 'a', Value: 'v' }]
    );
    const next = withMetadata(list, [{ Name: 'a', Type: 'String' }], new Set());
    expect(next.byName.get('a')).toEqual({
      Name: 'a',
      Type: 'String',
      Value: 'v'
    });
  });

  it('skips names deleted while loading', () => {
    const next = withMetadata(EMPTY_LIST, [{ Name: 'a' }], new Set(['a']));
    expect(next.byName.size).toBe(0);
  });
});

describe('withValues', () => {
  it('ignores values of names not listed', () => {
    expect(
      withValues(EMPTY_LIST, [{ Name: 'a', Value: 'v' }]).byName.size
    ).toBe(0);
  });
});

describe('withPut', () => {
  it('keeps the type and description an overwrite leaves out', () => {
    const list = withMetadata(
      EMPTY_LIST,
      [{ Name: 'a', Type: 'SecureString', Description: 'd', KeyId: 'k' }],
      new Set()
    );
    const entry = withPut(
      list,
      { name: 'a', value: 'v', overwrite: true },
      3
    ).byName.get('a');
    expect(entry).toMatchObject({
      Type: 'SecureString',
      Description: 'd',
      KeyId: 'k',
      Value: 'v',
      Version: 3
    });
  });

  it('drops the key when the type is no longer SecureString', () => {
    const list = withMetadata(
      EMPTY_LIST,
      [{ Name: 'a', Type: 'SecureString', KeyId: 'k' }],
      new Set()
    );
    const entry = withPut(
      list,
      { name: 'a', type: 'String', value: 'v' },
      2
    ).byName.get('a');
    expect(entry?.KeyId).toBeUndefined();
  });
});

describe('without', () => {
  it('removes the names', () => {
    expect([...without(listOf('a', 'b'), ['a']).byName.keys()]).toEqual(['b']);
  });
});

describe('settleLoad', () => {
  it('keeps what was seen or created and drops what was deleted', () => {
    const settled = settleLoad(
      listOf('seen', 'created', 'gone', 'deleted'),
      new Set(['seen', 'deleted']),
      {
        created: new Set(['created']),
        deleted: new Set(['deleted'])
      }
    );
    expect([...settled.byName.keys()]).toEqual(['seen', 'created']);
    expect(settled.syncedAt).toBeInstanceOf(Date);
  });
});

describe('sortedParameters', () => {
  it('sorts by name and reuses the result for the same list', () => {
    const { byName } = listOf('b', 'a');
    const sorted = sortedParameters(byName);
    expect(sorted.map(p => p.Name)).toEqual(['a', 'b']);
    expect(sortedParameters(byName)).toBe(sorted);
  });
});

describe('loadStateOf', () => {
  it('prefers an error screen, then loaded data', () => {
    const denied = { kind: 'denied' as const, message: '' };
    const generic = { kind: null, message: '' };
    expect(loadStateOf({ fetchError: denied, count: 3, loaded: true })).toBe(
      'denied'
    );
    expect(loadStateOf({ fetchError: generic, count: 3, loaded: true })).toBe(
      'ready'
    );
    expect(loadStateOf({ fetchError: generic, count: 0, loaded: true })).toBe(
      'error'
    );
    expect(loadStateOf({ fetchError: null, count: 0, loaded: true })).toBe(
      'empty'
    );
    expect(loadStateOf({ fetchError: null, count: 0, loaded: false })).toBe(
      'loading'
    );
  });
});
