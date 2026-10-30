import { describe, expect, it } from 'vitest';
import { isAwsManaged, kmsKeyName } from './kms';

describe('kms', () => {
  it('tells AWS managed keys apart', () => {
    expect(isAwsManaged('alias/aws/ssm')).toBe(true);
    expect(isAwsManaged('alias/app')).toBe(false);
  });

  it('names the default key when none is set', () => {
    expect(kmsKeyName(null)).toBe('alias/aws/ssm');
    expect(kmsKeyName('alias/app')).toBe('alias/app');
  });
});
