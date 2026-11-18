import { describe, expect, it } from 'vitest';
import { makeParameter } from '../test/testState';
import {
  copyButtonLabel,
  copyRequest,
  copySummary,
  copyTargets,
  filterTargets,
  isEncrypted,
  selectAllState,
  selectionOf,
  sourceEnvironments
} from './copyValue';
import type { CopyEnvironment } from './copyValue';

const env = (
  segment: string,
  state: CopyEnvironment['state'] = 'exists'
): CopyEnvironment => ({
  segment,
  color: '#52c41a',
  name: `/${segment}/app/Key`,
  state
});

const source = makeParameter('/dev/app/Key', {
  Type: 'SecureString',
  Value: 'secret',
  KeyId: 'alias/app'
});

const byName = new Map(
  [
    source,
    makeParameter('/staging/app/Key', { Value: 'secret' }),
    makeParameter('/prod/app/Key', {
      Type: 'SecureString',
      Value: 'old',
      KeyId: 'alias/prod'
    }),
    makeParameter('/qa/app/Key', { Value: undefined }),
    makeParameter('/legacy/app/Key', { Type: 'StringList', Value: 'a,b' })
  ].map(p => [p.Name, p])
);

const targets = copyTargets(
  source,
  [
    env('dev', 'current'),
    env('staging'),
    env('prod'),
    env('qa'),
    env('legacy'),
    env('test', 'missing')
  ],
  byName
);
const target = (segment: string) => targets.find(t => t.segment === segment)!;

describe('copyTargets', () => {
  it('lists the other environments with what a copy would do', () => {
    expect(targets.map(t => [t.segment, t.status])).toEqual([
      ['staging', 'same'],
      ['prod', 'overwrites'],
      // A value that didn't load is never the same.
      ['qa', 'overwrites'],
      ['legacy', 'overwrites'],
      ['test', 'new']
    ]);
  });
});

describe('copyRequest', () => {
  it('creates a new parameter with the source type and the picked key, without a description', () => {
    expect(copyRequest(source, target('test'), 'alias/picked')).toEqual({
      name: '/test/app/Key',
      type: 'SecureString',
      kmsKey: 'alias/picked',
      value: 'secret',
      overwrite: false
    });
  });

  it('overwrites an existing parameter with its own type and key', () => {
    expect(copyRequest(source, target('prod'), 'alias/picked')).toEqual({
      name: '/prod/app/Key',
      type: 'SecureString',
      kmsKey: 'alias/prod',
      value: 'secret',
      overwrite: true
    });
    expect(copyRequest(source, target('qa'), 'alias/picked')).toEqual({
      name: '/qa/app/Key',
      type: 'String',
      value: 'secret',
      overwrite: true
    });
  });

  it('leaves out the key of a new String', () => {
    const plain = makeParameter('/dev/app/Key', { Value: 'v' });
    expect(copyRequest(plain, target('test'), 'alias/picked')).toEqual({
      name: '/test/app/Key',
      type: 'String',
      value: 'v',
      overwrite: false
    });
  });
});

describe('copyRequest from an unsupported type', () => {
  it('throws instead of saving a StringList as a String', () => {
    const list = makeParameter('/dev/app/Key', {
      Type: 'StringList',
      Value: 'a,b'
    });
    expect(() => copyRequest(list, target('test'), undefined)).toThrow(
      "StringList values can't be copied yet"
    );
  });
});

describe('copySummary', () => {
  it('counts a secret copied to a StringList as unencrypted', () => {
    expect(copySummary(source, [target('legacy')])).toEqual({
      text: '1 overwrite · 1 unencrypted',
      overwrites: 1
    });
  });

  it('counts new, overwritten and unencrypted targets', () => {
    expect(
      copySummary(source, [target('prod'), target('qa'), target('test')])
    ).toEqual({ text: '1 new · 2 overwrites · 1 unencrypted', overwrites: 2 });
    expect(copySummary(source, [target('test')])).toEqual({
      text: '1 new',
      overwrites: 0
    });
  });
});

describe('sourceEnvironments', () => {
  it('lists the environments that have the key, with their type', () => {
    expect(
      sourceEnvironments(
        [env('dev', 'current'), env('legacy'), env('test', 'missing')],
        byName
      ).map(e => [e.segment, e.type])
    ).toEqual([
      ['dev', 'SecureString'],
      ['legacy', 'StringList']
    ]);
  });
});

describe('isEncrypted', () => {
  it('is true for a String copied into a SecureString', () => {
    const plain = makeParameter('/staging/app/Key', { Value: 'v' });
    expect(isEncrypted(plain, target('prod'))).toBe(true);
    expect(isEncrypted(plain, target('test'))).toBe(false);
    expect(isEncrypted(source, target('prod'))).toBe(false);
  });
});

describe('filterTargets', () => {
  it("doesn't filter a short list", () => {
    expect(filterTargets(targets, 'prod')).toEqual({
      filtering: false,
      listed: targets
    });
  });

  it('filters a long list by environment, ignoring case', () => {
    const long = [...targets, { ...target('test'), segment: 'Production' }];
    const { filtering, listed } = filterTargets(long, ' PROD ');
    expect(filtering).toBe(true);
    expect(listed.map(t => t.segment)).toEqual(['prod', 'Production']);
  });
});

describe('selectionOf and selectAllState', () => {
  it('ignores targets that already have the value', () => {
    const picked = new Set(['staging', 'prod']);
    const { selectable, selected } = selectionOf(targets, picked);
    expect(selectable.map(t => t.segment)).toEqual([
      'prod',
      'qa',
      'legacy',
      'test'
    ]);
    expect(selected.map(t => t.segment)).toEqual(['prod']);
    expect(selectAllState(targets, picked)).toMatchObject({
      checked: false,
      indeterminate: true
    });
    expect(
      selectAllState(targets, new Set(['prod', 'qa', 'legacy', 'test']))
    ).toMatchObject({ checked: true, indeterminate: false });
  });
});

describe('copyButtonLabel', () => {
  it('shows the progress, else the count', () => {
    expect(copyButtonLabel(undefined, 0)).toBe('Copy');
    expect(copyButtonLabel(undefined, 2)).toBe('Copy to 2 environments');
    expect(copyButtonLabel({ done: 1, total: 3 }, 3)).toBe('Copying 2 of 3…');
    expect(copyButtonLabel({ done: 3, total: 3 }, 3)).toBe('Copying 3 of 3…');
  });
});
