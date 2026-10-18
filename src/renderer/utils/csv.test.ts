import { describe, expect, it } from 'vitest';
import { exportFileName, parametersToCsv, toCsv } from './csv';

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

describe('exportFileName', () => {
  const date = new Date(2026, 9, 18, 14, 3, 22);

  it('names the account, region, path and local time', () => {
    expect(
      exportFileName({
        account: '123456789012',
        region: 'eu-west-1',
        path: '/app/*/db/',
        date
      })
    ).toBe(
      'ssm-parameters_123456789012_eu-west-1_app-db_2026-10-18_14-03-22.csv'
    );
  });

  it('leaves out an empty account and path', () => {
    expect(
      exportFileName({ account: '', region: 'us-east-1', path: '', date })
    ).toBe('ssm-parameters_us-east-1_2026-10-18_14-03-22.csv');
  });
});
