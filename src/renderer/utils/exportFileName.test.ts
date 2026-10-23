import { describe, expect, it } from 'vitest';
import { exportFileName } from './exportFileName';

describe('exportFileName', () => {
  const date = new Date(2026, 9, 18, 14, 3, 22);

  it('names the account, region, path and local time', () => {
    expect(
      exportFileName({
        account: '123456789012',
        region: 'eu-west-1',
        path: '/app/*/db/',
        date,
        extension: 'csv'
      })
    ).toBe(
      'ssm-parameters_123456789012_eu-west-1_app-db_2026-10-18_14-03-22.csv'
    );
  });

  it('leaves out an empty account and path', () => {
    expect(
      exportFileName({
        account: '',
        region: 'us-east-1',
        path: '',
        date,
        extension: 'json'
      })
    ).toBe('ssm-parameters_us-east-1_2026-10-18_14-03-22.json');
  });
});
