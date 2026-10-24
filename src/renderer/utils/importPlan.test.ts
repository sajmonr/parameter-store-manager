import { describe, expect, it } from 'vitest';
import { countStatuses, isWritten, planImport } from './importPlan';
import type { Existing } from './importPlan';
import type { ImportEntry } from './importFile';

const entry = (
  name: string,
  extra: Partial<ImportEntry> = {}
): ImportEntry => ({
  name,
  type: 'String',
  value: 'v',
  description: '',
  keyId: null,
  ...extra
});

const statuses = (entries: ImportEntry[], existing: Record<string, Existing>) =>
  planImport(entries, new Map(Object.entries(existing))).map(row => row.status);

describe('planImport', () => {
  it('compares each entry with the loaded parameter of the same name', () => {
    expect(
      statuses(
        [
          entry('/new'),
          entry('/same', { description: 'd' }),
          entry('/value'),
          entry('/description', { description: 'new' }),
          entry('/list')
        ],
        {
          '/same': { Type: 'String', Value: 'v', Description: 'd' },
          '/value': { Type: 'String', Value: 'old' },
          '/description': { Type: 'String', Value: 'v', Description: 'old' },
          '/list': { Type: 'StringList', Value: 'v' }
        }
      )
    ).toEqual(['new', 'unchanged', 'changed', 'changed', 'typeChange']);
  });

  it('compares SecureString keys, with the default key as null', () => {
    const secure = { type: 'SecureString' as const };
    expect(
      statuses(
        [
          entry('/default', secure),
          entry('/custom', { ...secure, keyId: 'alias/app' }),
          entry('/moved', { ...secure, keyId: 'alias/app' })
        ],
        {
          '/default': {
            Type: 'SecureString',
            Value: 'v',
            KeyId: 'alias/aws/ssm'
          },
          '/custom': { Type: 'SecureString', Value: 'v', KeyId: 'alias/app' },
          '/moved': { Type: 'SecureString', Value: 'v', KeyId: 'alias/aws/ssm' }
        }
      )
    ).toEqual(['unchanged', 'unchanged', 'changed']);
  });

  it('marks StringLists as unsupported, whether or not they exist', () => {
    const list = { type: 'StringList' as const };
    expect(
      statuses([entry('/new', list), entry('/old', list)], {
        '/old': { Type: 'StringList', Value: 'v' }
      })
    ).toEqual(['unsupported', 'unsupported']);
  });

  it('skips SecureStrings exported without their value', () => {
    expect(
      statuses([entry('/s', { type: 'SecureString', value: null })], {})
    ).toEqual(['skipped']);
  });

  it('treats a parameter whose value failed to load as changed', () => {
    expect(statuses([entry('/a')], { '/a': { Type: 'String' } })).toEqual([
      'changed'
    ]);
  });
});

describe('planImport changes', () => {
  it('lists the fields a changed entry changes, with the loaded parameter', () => {
    const existing = {
      Type: 'SecureString',
      Value: 'old',
      Description: 'd',
      KeyId: 'alias/aws/ssm'
    };
    const [row] = planImport(
      [
        entry('/s', {
          type: 'SecureString',
          value: 'new',
          description: 'd',
          keyId: 'alias/app'
        })
      ],
      new Map([['/s', existing]])
    );
    expect(row).toMatchObject({
      status: 'changed',
      existing,
      changes: ['value', 'keyId']
    });
  });

  it('lists no changes for other statuses', () => {
    const [created, same] = planImport(
      [entry('/new'), entry('/same')],
      new Map([['/same', { Type: 'String', Value: 'v' }]])
    );
    expect(created).toMatchObject({ status: 'new', changes: [] });
    expect(same).toMatchObject({ status: 'unchanged', changes: [] });
  });
});

describe('isWritten', () => {
  it('writes new parameters, and changed ones only with Overwrite', () => {
    expect(isWritten('new', false)).toBe(true);
    expect(isWritten('changed', false)).toBe(false);
    expect(isWritten('changed', true)).toBe(true);
    expect(isWritten('unchanged', true)).toBe(false);
    expect(isWritten('skipped', true)).toBe(false);
    expect(isWritten('typeChange', true)).toBe(false);
    expect(isWritten('unsupported', true)).toBe(false);
  });
});

describe('countStatuses', () => {
  it('counts every status', () => {
    const rows = planImport([entry('/a'), entry('/b')], new Map());
    expect(countStatuses(rows)).toEqual({
      new: 2,
      changed: 0,
      unchanged: 0,
      skipped: 0,
      typeChange: 0,
      unsupported: 0
    });
  });
});
