import { describe, expect, it } from 'vitest';
import { createMatcher, globToRegExp, isGlobQuery } from './search';

const names = [
  '/development/compass/AppServer/Dashboard/Password',
  '/development/compass/AppServer/Workers/RetryLimit',
  '/production/compass/ConnectionStrings/AppServer',
  '/staging/other/Password'
];
const filter = (query: string, delimiter = '/') => {
  const matcher = createMatcher(query, delimiter);
  return names.filter(matcher.test);
};

describe('isGlobQuery', () => {
  it('detects wildcards and a leading delimiter', () => {
    expect(isGlobQuery('**/Password', '/')).toBe(true);
    expect(isGlobQuery('Pass?ord', '/')).toBe(true);
    expect(isGlobQuery('/development', '/')).toBe(true);
    expect(isGlobQuery('Password', '/')).toBe(false);
    expect(isGlobQuery('.app', '.')).toBe(true);
  });
});

describe('createMatcher', () => {
  it('matches everything for an empty or blank query', () => {
    expect(filter('')).toEqual(names);
    expect(filter('   ')).toEqual(names);
    expect(createMatcher('', '/').isGlob).toBe(false);
  });

  it('matches plain text case-insensitively anywhere in the name', () => {
    expect(filter('appserver')).toEqual(names.slice(0, 3));
    expect(createMatcher('appserver', '/').isGlob).toBe(false);
  });

  it('anchors a leading delimiter at the start and matches as a prefix', () => {
    expect(filter('/development/**')).toEqual(names.slice(0, 2));
    expect(filter('/development')).toEqual(names.slice(0, 2));
    expect(filter('/compass')).toEqual([]);
  });

  it('lets an unanchored glob start at any segment', () => {
    expect(filter('**/Password')).toEqual([names[0], names[3]]);
    expect(filter('compass/*/Dash*')).toEqual([names[0]]);
  });

  it('lets ** match zero or more folders', () => {
    const nested = ['/dev/Password', '/dev/a/Password', '/dev/a/b/Password'];
    const test = (query: string) =>
      nested.filter(createMatcher(query, '/').test);
    expect(test('/dev/**/Password')).toEqual(nested);
    expect(test('**/Password')).toEqual(nested);
    expect(test('/dev/**')).toEqual(nested);
    expect(
      ['app.Key', 'app.x.Key'].filter(createMatcher('app.**.Key', '.').test)
    ).toEqual(['app.Key', 'app.x.Key']);
  });

  it('keeps * and ? within one segment', () => {
    expect(filter('/development/*/Dashboard')).toEqual([]);
    expect(filter('/development/*/AppServer/Dash?oard')).toEqual([names[0]]);
  });

  it('is case-sensitive for globs', () => {
    expect(filter('**/password')).toEqual([]);
  });

  it('uses the configured delimiter', () => {
    const dotted = ['app.db.Password', 'app.cache.Host', 'other.Password'];
    const matcher = createMatcher('app.*.Password', '.');
    expect(dotted.filter(matcher.test)).toEqual(['app.db.Password']);
    expect(dotted.filter(createMatcher('.app.**', '.').test)).toEqual([]);
    expect(dotted.filter(createMatcher('*.Password', '.').test)).toEqual([
      'app.db.Password',
      'other.Password'
    ]);
  });

  it('escapes regular expression characters', () => {
    expect(globToRegExp('a+b(c)*', '/').test('a+b(c)d')).toBe(true);
    expect(globToRegExp('a+b', '/').test('aab')).toBe(false);
  });
});
