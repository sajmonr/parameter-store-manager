import { describe, expect, it } from 'vitest';
import { DEFAULT_STRUCTURE } from '../../shared/structure';
import type { Structure } from '../../shared/structure';
import { makeParameter } from '../test/testState';
import { compare, compareRows, filterKeys, isFolderRow } from './compare';
import type { LocationContext, ServiceLocation } from './location';
import { createMatcher } from './search';

const structure: Structure = {
  ...DEFAULT_STRUCTURE,
  enabled: true,
  services: [
    {
      segment: 'compass',
      environments: ['production', 'development', 'staging']
    }
  ]
};
const ctx: LocationContext = { structure, delimiter: '/' };
const everything = createMatcher('', '/');

const compass = (folder = ''): ServiceLocation => ({
  view: 'services',
  service: 'compass',
  env: 'development',
  folder
});

const parameters = [
  makeParameter('/development/compass/Same', { Value: 'x' }),
  makeParameter('/staging/compass/Same', { Value: 'x' }),
  makeParameter('/production/compass/Same', { Value: 'x' }),
  makeParameter('/development/compass/Changed', { Value: 'a' }),
  makeParameter('/staging/compass/Changed', { Value: 'b' }),
  makeParameter('/production/compass/Changed', { Value: 'a' }),
  makeParameter('/development/compass/AppServer/Port', { Value: '80' }),
  makeParameter('/staging/compass/AppServer/Port', { Value: '80' }),
  makeParameter('/development/compass/AppServer/Host', { Value: 'dev' }),
  makeParameter('/staging/compass/AppServer/Host', { Value: 'stg' }),
  makeParameter('/development/billing/Other'),
  makeParameter('/qa/compass/Same')
];

const byKey = (comparison: ReturnType<typeof compare>) =>
  Object.fromEntries(comparison.keys.map(k => [k.key, k]));

describe('compare', () => {
  it('lists the environments in the configured order', () => {
    const { environments } = compare(compass(), parameters, everything, ctx);
    expect(environments.map(e => e.segment)).toEqual([
      'development',
      'staging',
      'production'
    ]);
  });

  it('marks the keys that differ and the keys an environment lacks', () => {
    const keys = byKey(compare(compass(), parameters, everything, ctx));
    expect(keys.Same).toMatchObject({ differs: false, missing: [] });
    expect(keys.Changed).toMatchObject({ differs: true, missing: [] });
    expect(keys['AppServer/Port']).toMatchObject({
      differs: false,
      missing: ['production']
    });
    expect(keys['AppServer/Host']).toMatchObject({
      differs: true,
      missing: ['production']
    });
  });

  it('compares the raw value and the type', () => {
    const keys = byKey(
      compare(
        compass(),
        [
          makeParameter('/development/compass/Case', { Value: 'On' }),
          makeParameter('/staging/compass/Case', { Value: 'on' }),
          makeParameter('/development/compass/Space', { Value: 'x' }),
          makeParameter('/staging/compass/Space', { Value: 'x ' }),
          makeParameter('/development/compass/Secret', { Value: 'x' }),
          makeParameter('/staging/compass/Secret', {
            Value: 'x',
            Type: 'SecureString'
          }),
          makeParameter('/development/compass/Decrypted', {
            Value: 's3cret',
            Type: 'SecureString'
          }),
          makeParameter('/staging/compass/Decrypted', {
            Value: 's3cret',
            Type: 'SecureString'
          })
        ],
        everything,
        ctx
      )
    );
    expect(keys.Case!.differs).toBe(true);
    expect(keys.Space!.differs).toBe(true);
    expect(keys.Secret!.differs).toBe(true);
    expect(keys.Decrypted!.differs).toBe(false);
  });

  it("leaves values that didn't load out of the comparison", () => {
    const unloaded = [
      makeParameter('/development/compass/Secret', {
        Value: 'a',
        Type: 'SecureString'
      }),
      makeParameter('/staging/compass/Secret', {
        Value: undefined,
        Type: 'SecureString'
      }),
      makeParameter('/production/compass/Secret', {
        Value: 'a',
        Type: 'SecureString'
      })
    ];
    expect(
      byKey(compare(compass(), unloaded, everything, ctx)).Secret
    ).toMatchObject({ differs: false, unreadable: ['staging'] });
    expect(compare(compass(), unloaded, everything, ctx).pending).toBe(0);
    // Still loading: not unreadable yet, but pending.
    const loading = compare(compass(), unloaded, everything, ctx, true);
    expect(byKey(loading).Secret).toMatchObject({
      differs: false,
      unreadable: []
    });
    expect(loading.pending).toBe(1);
  });

  it('keeps to the folder, with folders relative to it', () => {
    const { keys, total } = compare(
      compass('AppServer/'),
      parameters,
      everything,
      ctx
    );
    expect(keys.map(k => [k.key, k.folder])).toEqual([
      ['AppServer/Host', ''],
      ['AppServer/Port', '']
    ]);
    expect(total).toBe(2);
  });

  it('lists a key when the search matches it in any environment', () => {
    const comparison = compare(
      compass(),
      parameters,
      createMatcher('/staging/**/Host', '/'),
      ctx
    );
    expect(comparison.keys.map(k => k.key)).toEqual(['AppServer/Host']);
    // Every environment's value is still shown and compared.
    expect(comparison.keys[0]!.cells.size).toBe(2);
    expect(comparison.total).toBe(4);
  });

  it('counts the keys of each filter', () => {
    const comparison = compare(compass(), parameters, everything, ctx);
    expect(comparison.counts).toEqual({ all: 4, differs: 2, missing: 2 });
    expect(filterKeys(comparison.keys, 'differs').map(k => k.key)).toEqual([
      'Changed',
      'AppServer/Host'
    ]);
    expect(filterKeys(comparison.keys, 'missing').map(k => k.key)).toEqual([
      'AppServer/Host',
      'AppServer/Port'
    ]);
  });
});

describe('compareRows', () => {
  it("puts the folder's own keys first, then a header row per folder", () => {
    const { keys } = compare(compass(), parameters, everything, ctx);
    expect(
      compareRows(keys).map(row =>
        isFolderRow(row) ? `${row.folder} (${row.count})` : row.key
      )
    ).toEqual([
      'Changed',
      'Same',
      'AppServer/ (2)',
      'AppServer/Host',
      'AppServer/Port'
    ]);
  });
});
