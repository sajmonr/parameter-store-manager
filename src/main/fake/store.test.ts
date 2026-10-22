import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { beforeEach, describe, expect, it } from 'vitest';
import { FakeParameterStore } from './store';
import type { FakeDataset } from './store';

const dataset: FakeDataset = {
  accountId: '000000000000',
  aliases: [{ AliasName: 'alias/aws/ssm', TargetKeyId: 'key-1' }],
  parameters: ['/b/Two', '/a/One', '/a/Three', '/c/Four'].map(Name => ({
    Name,
    Type: 'String',
    Value: `value of ${Name}`,
    Version: 1,
    LastModifiedDate: '2026-01-01T00:00:00.000Z'
  }))
};

let dir: string;
let working: string;
const createStore = (pageSize = 2) =>
  new FakeParameterStore(join(dir, 'fixture.json'), working, pageSize);

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'psm-fake-'));
  working = join(dir, 'data', 'parameters.json');
  writeFileSync(join(dir, 'fixture.json'), JSON.stringify(dataset));
});

describe('FakeParameterStore', () => {
  it('pages through the parameters sorted by name, without values', () => {
    const store = createStore();
    const first = store.describe({});
    expect(first.Parameters!.map(p => p.Name)).toEqual(['/a/One', '/a/Three']);
    expect(first.Parameters![0]).not.toHaveProperty('Value');
    expect(first.Parameters![0]!.LastModifiedDate).toBeInstanceOf(Date);

    const second = store.describe({ NextToken: first.NextToken });
    expect(second.Parameters!.map(p => p.Name)).toEqual(['/b/Two', '/c/Four']);
    expect(second.NextToken).toBeUndefined();
  });

  it('filters by name prefix and caps the page size', () => {
    const store = createStore(10);
    const page = store.describe({
      MaxResults: 50,
      ParameterFilters: [{ Key: 'Name', Option: 'BeginsWith', Values: ['/a/'] }]
    });
    expect(page.Parameters!.map(p => p.Name)).toEqual(['/a/One', '/a/Three']);
    expect(createStore(1).describe({ MaxResults: 50 }).Parameters).toHaveLength(
      1
    );
  });

  it('returns values and lists the names that do not exist', () => {
    const result = createStore().get({ Names: ['/a/One', '/missing'] });
    expect(result.Parameters!.map(p => p.Value)).toEqual(['value of /a/One']);
    expect(result.InvalidParameters).toEqual(['/missing']);
  });

  it('creates, overwrites and deletes, like SSM', () => {
    const store = createStore();
    expect(
      store.put({ Name: '/d/New', Type: 'SecureString', Value: 'secret' })
    ).toMatchObject({ Version: 1 });
    expect(() => store.put({ Name: '/d/New', Value: 'again' })).toThrow(
      expect.objectContaining({ name: 'ParameterAlreadyExists' })
    );
    expect(
      store.put({ Name: '/d/New', Value: 'again', Overwrite: true })
    ).toMatchObject({ Version: 2 });
    const [saved] = store.get({ Names: ['/d/New'] }).Parameters!;
    expect(saved).toMatchObject({ Type: 'SecureString', Value: 'again' });

    expect(store.delete({ Names: ['/a/One', '/d/New'] })).toMatchObject({
      DeletedParameters: ['/a/One', '/d/New'],
      InvalidParameters: []
    });
    expect(store.delete({ Names: ['/a/One'] })).toMatchObject({
      DeletedParameters: [],
      InvalidParameters: ['/a/One']
    });
  });

  it('keeps changes in the working copy, not the fixture, until reset', () => {
    const store = createStore();
    store.delete({ Names: ['/a/One'] });
    expect(createStore().get({ Names: ['/a/One'] }).Parameters).toEqual([]);
    expect(readFileSync(join(dir, 'fixture.json'), 'utf8')).toBe(
      JSON.stringify(dataset)
    );

    store.reset();
    expect(store.get({ Names: ['/a/One'] }).Parameters).toHaveLength(1);
  });
});
