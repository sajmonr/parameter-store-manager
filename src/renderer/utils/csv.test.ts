import { describe, expect, it } from 'vitest';
import { fromCsv, parametersToCsv, parseCsvExport, toCsv } from './csv';
import { NO_PARAMETERS, NOT_AN_EXPORT } from './importFile';

describe('toCsv', () => {
  it('quotes fields with commas, quotes or line breaks', () => {
    expect(toCsv([['a', 'b,c', 'say "hi"', 'one\ntwo', 'x\r\ny']])).toBe(
      'a,"b,c","say ""hi""","one\ntwo","x\r\ny"\r\n'
    );
  });
});

describe('parametersToCsv', () => {
  it('writes a header, then one row per parameter', () => {
    expect(
      parametersToCsv([
        {
          Name: '/a',
          Value: 'secret',
          Type: 'SecureString',
          Description: 'DB password',
          KeyId: 'alias/aws/ssm'
        },
        { Name: '/b', Value: 'x,y', Type: 'StringList' },
        { Name: '/c', Type: 'SecureString', KeyId: 'alias/app' }
      ])
    ).toBe(
      'name,value,type,description,kmsKey\r\n' +
        '/a,secret,SecureString,DB password,alias/aws/ssm\r\n' +
        '/b,"x,y",StringList,,\r\n' +
        '/c,,SecureString,,alias/app\r\n'
    );
  });
});

describe('fromCsv', () => {
  it('reads back what toCsv writes', () => {
    const rows = [
      ['a', 'b,c', 'say "hi"', 'one\ntwo', 'x\r\ny', ''],
      ['', ' padded ']
    ];
    expect(fromCsv(toCsv(rows))).toEqual({ ok: true, rows });
  });

  it('takes LF line endings, a byte-order mark and no final line break', () => {
    expect(fromCsv('\uFEFFa,b\nc,"d"')).toEqual({
      ok: true,
      rows: [
        ['a', 'b'],
        ['c', 'd']
      ]
    });
  });

  it('reads an empty quoted field', () => {
    expect(fromCsv('a,"",b\n""')).toEqual({
      ok: true,
      rows: [['a', '', 'b'], ['']]
    });
  });

  it.each([
    ['inside an unquoted field', 'a,b\nc,ab"cd"ef,g\n'],
    ['after a closing quote', 'a,b\nc,"ab"cd\n'],
    ['after leading spaces', 'a,b\nc, "d"\n'],
    ['that is never closed', 'a,b\nc,"d\n']
  ])('fails on a quote %s, naming its row', (_, text) => {
    expect(fromCsv(text)).toEqual({ ok: false, row: 2 });
  });
});

describe('parseCsvExport', () => {
  const header = 'name,value,type,description,kmsKey\r\n';
  const errorOf = (text: string) => {
    const result = parseCsvExport(text);
    return result.ok ? null : result.error;
  };

  it('reads back what parametersToCsv writes', () => {
    const text = parametersToCsv([
      {
        Name: '/a',
        Value: 'line one\nline "two", three',
        Type: 'SecureString',
        Description: 'DB password',
        KeyId: 'alias/app'
      },
      {
        Name: '/b',
        Value: 'x',
        Type: 'SecureString',
        KeyId: 'alias/aws/ssm'
      },
      { Name: '/c', Type: 'SecureString', KeyId: 'alias/app' },
      { Name: '/d', Value: 'x,y', Type: 'StringList' },
      { Name: '/e', Value: 'plain', Type: 'String', Description: 'Title' }
    ]);
    expect(parseCsvExport(text)).toEqual({
      ok: true,
      file: {
        exportedAt: null,
        region: null,
        parameters: [
          {
            name: '/a',
            type: 'SecureString',
            value: 'line one\nline "two", three',
            description: 'DB password',
            keyId: 'alias/app'
          },
          // The default key is stored as null.
          {
            name: '/b',
            type: 'SecureString',
            value: 'x',
            description: '',
            keyId: null
          },
          // Exported without decryption: skipped on import.
          {
            name: '/c',
            type: 'SecureString',
            value: null,
            description: '',
            keyId: 'alias/app'
          },
          {
            name: '/d',
            type: 'StringList',
            value: 'x,y',
            description: '',
            keyId: null
          },
          {
            name: '/e',
            type: 'String',
            value: 'plain',
            description: 'Title',
            keyId: null
          }
        ]
      }
    });
  });

  it('takes a file a spreadsheet saved: LF, a byte-order mark, blank lines', () => {
    const result = parseCsvExport(
      '\uFEFFName,Value,Type,Description,KmsKey\n/a,x,String,,\n\n'
    );
    expect(result.ok && result.file.parameters.map(p => p.name)).toEqual([
      '/a'
    ]);
  });

  it.each([
    ['an empty file', ''],
    ['another header', 'name,value\r\n/a,x\r\n'],
    ['JSON', '{"format": "parameter-store-manager"}']
  ])('rejects %s', (_, text) => {
    expect(errorOf(text)).toBe(NOT_AN_EXPORT);
  });

  it.each([
    [
      'a quote inside a value',
      `${header}/app/Secret,ab"cd"ef,SecureString,,\r\n`
    ],
    ['a quote that is never closed', `${header}/a,"x,String,,\r\n`]
  ])('rejects %s instead of changing the value', (_, text) => {
    expect(errorOf(text)).toBe(
      "Row 2 has a quote in the wrong place, so its values can't be read safely."
    );
  });

  it('rejects a file with only the header', () => {
    expect(errorOf(header)).toBe(NO_PARAMETERS);
    expect(errorOf(`${header}\r\n\r\n`)).toBe(NO_PARAMETERS);
  });

  it('lists the invalid rows, numbered as a spreadsheet numbers them', () => {
    expect(
      errorOf(
        header +
          '/ok,x,String,,\r\n' +
          'a/b,x,String,,\r\n' +
          '/b,x,Number,,\r\n' +
          '/c,,String,,\r\n' +
          '/d,x,String\r\n' +
          '/ok,x,String,,\r\n'
      )
    ).toBe(
      "5 entries are invalid: row 3: a/b doesn't start with /; " +
        'row 4: /b has type Number, not String, SecureString or StringList; ' +
        'row 5: /c has no value and 2 more.'
    );
  });
});
