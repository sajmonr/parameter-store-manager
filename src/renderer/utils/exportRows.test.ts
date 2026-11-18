import { describe, expect, it } from 'vitest';
import { exportRows, exportsType, toExported } from './exportRows';
import type { Listed } from './exportRows';

describe('exportsType', () => {
  it('leaves StringLists out of JSON only', () => {
    expect(exportsType('csv', 'StringList')).toBe(true);
    expect(exportsType('json', 'StringList')).toBe(false);
    expect(exportsType('json', 'SecureString')).toBe(true);
  });
});

describe('exportRows', () => {
  const listed: Listed[] = [
    { Name: 'b', Type: 'String', Description: 'desc' },
    { Name: 'a', Type: 'String', KeyId: 'alias/x' },
    { Name: 'gone', Type: 'String' }
  ];

  it('sorts, drops deleted names and uses the fetched type', () => {
    const rows = exportRows({
      listed,
      fetched: new Map([
        ['a', { Type: 'SecureString', Value: 'secret' }],
        ['b', { Value: 'plain' }]
      ]),
      deleted: new Set(['gone']),
      format: 'csv',
      includeSecureValues: false
    });
    expect(rows).toEqual([
      {
        Name: 'a',
        Type: 'SecureString',
        KeyId: 'alias/x',
        Value: undefined,
        Description: undefined
      },
      {
        Name: 'b',
        Type: 'String',
        Value: 'plain',
        Description: 'desc',
        KeyId: undefined
      }
    ]);
  });

  it('includes SecureString values when asked', () => {
    const [row] = exportRows({
      listed: [listed[1]!],
      fetched: new Map([['a', { Type: 'SecureString', Value: 'secret' }]]),
      deleted: new Set(),
      format: 'json',
      includeSecureValues: true
    });
    expect(row?.Value).toBe('secret');
  });
});

describe('toExported', () => {
  it('fills in an empty description and a missing value', () => {
    expect(toExported({ Name: 'a', Type: 'String' })).toMatchObject({
      name: 'a',
      type: 'String',
      value: null,
      description: ''
    });
  });
});
