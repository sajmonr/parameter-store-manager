import { describe, expect, it } from 'vitest';
import { makeParameter } from '../test/testState';
import { copyRequest, copySummary, copyTargets } from './copyValue';
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
