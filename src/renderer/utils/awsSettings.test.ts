import { describe, expect, it } from 'vitest';
import { profileChoices, regionOptions } from './awsSettings';

describe('regionOptions', () => {
  it('keeps a region that is not in the list', () => {
    const values = regionOptions('xx-test-1').map(o => o.value);
    expect(values).toContain('xx-test-1');
    expect(values).toContain('eu-west-1');
    expect(new Set(values).size).toBe(values.length);
  });
});

describe('profileChoices', () => {
  const profiles = [
    { name: 'default', source: 'credentials' },
    { name: 'work', source: 'config' }
  ] as Parameters<typeof profileChoices>[0]['profiles'];

  it('shows the SDK default as "default" without AWS_PROFILE', () => {
    expect(profileChoices({ profiles, envProfile: null }, '')).toEqual([
      { value: '', name: 'default', suffix: 'from ~/.aws/credentials' },
      { value: 'work', name: 'work', suffix: 'from ~/.aws/config' }
    ]);
  });

  it('lists both with AWS_PROFILE, and keeps an unknown current profile', () => {
    const choices = profileChoices({ profiles, envProfile: 'work' }, 'gone');
    expect(choices.map(c => [c.value, c.name])).toEqual([
      ['', 'SDK default'],
      ['gone', 'gone'],
      ['default', 'default'],
      ['work', 'work']
    ]);
  });
});
