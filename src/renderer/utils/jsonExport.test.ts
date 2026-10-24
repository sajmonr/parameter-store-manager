import { describe, expect, it } from 'vitest';
import { NO_PARAMETERS, NOT_AN_EXPORT } from './importFile';
import { parseJsonExport, toJsonExport } from './jsonExport';
import type { ExportedParameter } from './jsonExport';

const parameter = (
  name: string,
  extra: Partial<ExportedParameter> = {}
): ExportedParameter => ({
  name,
  type: 'String',
  value: 'v',
  description: '',
  keyId: null,
  ...extra
});

const file = (parameters: unknown[], extra: object = {}) =>
  JSON.stringify({
    format: 'parameter-store-manager',
    version: 1,
    exportedAt: '2026-10-14T09:12:00Z',
    region: 'us-east-1',
    decrypted: true,
    parameters,
    ...extra
  });

const errorOf = (text: string) => {
  const result = parseJsonExport(text);
  return result.ok ? null : result.error;
};

describe('toJsonExport', () => {
  it('writes the file sorted by name, with a 2-space indent', () => {
    const text = toJsonExport({
      region: 'eu-west-1',
      decrypted: false,
      date: new Date('2026-10-14T09:12:00.123Z'),
      parameters: [parameter('/b'), parameter('/a', { value: null })]
    });
    expect(text).toBe(`{
  "format": "parameter-store-manager",
  "version": 1,
  "exportedAt": "2026-10-14T09:12:00Z",
  "region": "eu-west-1",
  "decrypted": false,
  "parameters": [
    {
      "name": "/a",
      "type": "String",
      "value": null,
      "description": "",
      "keyId": null
    },
    {
      "name": "/b",
      "type": "String",
      "value": "v",
      "description": "",
      "keyId": null
    }
  ]
}
`);
  });

  it('reads back what it writes', () => {
    const parameters = [
      parameter('/a', {
        type: 'SecureString',
        value: 's3cret',
        description: 'Login',
        keyId: 'alias/app'
      }),
      parameter('/b', { type: 'SecureString', value: null })
    ];
    const text = toJsonExport({
      region: 'eu-west-1',
      decrypted: true,
      date: new Date(),
      parameters
    });
    const result = parseJsonExport(text);
    expect(result.ok && result.file.parameters).toEqual(parameters);
  });
});

describe('parseJsonExport', () => {
  it('reads an export, defaulting missing descriptions and the default key', () => {
    const result = parseJsonExport(
      file([
        { name: '/a', type: 'String', value: 'x' },
        {
          name: '/b',
          type: 'SecureString',
          value: 'y',
          keyId: 'alias/aws/ssm'
        }
      ])
    );
    expect(result).toEqual({
      ok: true,
      file: {
        exportedAt: '2026-10-14T09:12:00Z',
        region: 'us-east-1',
        parameters: [
          parameter('/a', { value: 'x' }),
          parameter('/b', { type: 'SecureString', value: 'y' })
        ]
      }
    });
  });

  it.each([
    ['not JSON', '{'],
    ['another format', file([], { format: 'other' })],
    [
      'no parameters',
      JSON.stringify({ format: 'parameter-store-manager', version: 1 })
    ],
    ['an array', '[]']
  ])('rejects %s', (_, text) => {
    expect(errorOf(text)).toBe(NOT_AN_EXPORT);
  });

  it('rejects a file with no parameters', () => {
    expect(errorOf(file([]))).toBe(NO_PARAMETERS);
  });

  it('rejects a version it can’t read', () => {
    expect(errorOf(file([], { version: 2 }))).toBe(
      "This file is export version 2, which this version of the app can't read."
    );
  });

  it('lists the invalid entries', () => {
    expect(
      errorOf(
        file([
          { name: '', type: 'String', value: 'x' },
          { name: 'a/b', type: 'String', value: 'x' },
          { name: '/a b', type: 'String', value: 'x' },
          { name: '/c', type: 'StringList', value: 'x,y' },
          { name: '/ok', type: 'String', value: 'x' }
        ])
      )
    ).toBe(
      "4 entries are invalid: entry 1: no name; entry 2: a/b doesn't start with /; entry 3: /a b contains whitespace and 1 more."
    );
  });

  it.each([
    ['a String without a value', { name: '/a', type: 'String', value: null }],
    ['an empty value', { name: '/a', type: 'String', value: '' }],
    [
      'a non-string description',
      { name: '/a', type: 'String', value: 'x', description: 1 }
    ],
    ['a non-string keyId', { name: '/a', type: 'String', value: 'x', keyId: 2 }]
  ])('rejects %s', (_, entry) => {
    expect(errorOf(file([entry]))).toMatch(/^1 entry is invalid: entry 1: /);
  });

  it('takes a top-level name without a slash, as SSM does', () => {
    const result = parseJsonExport(
      file([{ name: 'Flag', type: 'String', value: 'x' }])
    );
    expect(result.ok).toBe(true);
  });

  it('rejects a name listed twice', () => {
    const entry = { name: '/a', type: 'String', value: 'x' };
    expect(errorOf(file([entry, entry]))).toBe(
      '1 entry is invalid: entry 2: /a is listed twice.'
    );
  });
});
