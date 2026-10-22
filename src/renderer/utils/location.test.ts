import { describe, expect, it } from 'vitest';
import { DEFAULT_STRUCTURE } from '../../shared/structure';
import type { Structure } from '../../shared/structure';
import {
  contains,
  convert,
  envFor,
  locationOf,
  otherNodeKey,
  pathFolderOf,
  relativeFolder,
  rowsFor,
  serviceNodeKey,
  treeKeyOf,
  treeKeysTo,
  validate
} from './location';
import type { Location, LocationContext, ServiceLocation } from './location';
import { parse } from './structure';

const structure: Structure = {
  ...DEFAULT_STRUCTURE,
  enabled: true,
  services: [
    { segment: 'compass', environments: ['development', 'staging'] },
    { segment: 'billing', environments: ['production', 'staging'] }
  ]
};
const ctx: LocationContext = { structure, delimiter: '/' };
const svcFirst: LocationContext = {
  structure: { ...structure, layout: 'svc-first' },
  delimiter: '/'
};
const prefs = { defaultView: 'services' as const, lastEnv: null };

const names = [
  '/development/compass/AppServer/Dashboard/Title',
  '/development/compass/AppServer/Port',
  '/development/compass/Flag',
  '/staging/compass/AppServer/Port',
  '/production/compass/Flag',
  '/production/billing/Key',
  '/random/thing',
  '/Root'
];
const rows = names.map(Name => ({ Name }));
const namesAt = (location: Location, context = ctx) =>
  rowsFor(location, rows, context).map(r => r.Name);

const compassDev = (folder = ''): ServiceLocation => ({
  view: 'services',
  service: 'compass',
  env: 'development',
  folder
});

describe('locationOf', () => {
  it('is the folder in the Paths view', () => {
    expect(locationOf('/development/compass/Flag', 'paths', ctx)).toEqual({
      view: 'paths',
      scope: '/development/compass/'
    });
  });

  it('is the service, environment and key folder in the Services view', () => {
    expect(
      locationOf('/development/compass/AppServer/Port', 'services', ctx)
    ).toEqual(compassDev('AppServer/'));
    expect(locationOf('/compass/staging/A/B', 'services', svcFirst)).toEqual({
      view: 'services',
      service: 'compass',
      env: 'staging',
      folder: 'A/'
    });
  });

  it('is a folder of Other paths for a name that does not fit', () => {
    expect(locationOf('/random/thing', 'services', ctx)).toEqual({
      view: 'services',
      other: true,
      folder: '/random/'
    });
    // compass isn't in production.
    expect(locationOf('/production/compass/Flag', 'services', ctx)).toEqual({
      view: 'services',
      other: true,
      folder: '/production/compass/'
    });
    expect(locationOf('/Root', 'services', ctx)).toEqual({
      view: 'services',
      other: true,
      folder: ''
    });
  });
});

describe('convert', () => {
  it('turns a service folder into its path', () => {
    expect(convert(compassDev('AppServer/'), 'paths', ctx)).toEqual({
      view: 'paths',
      scope: '/development/compass/AppServer/'
    });
    expect(
      convert({ ...compassDev(), env: 'staging' }, 'paths', svcFirst)
    ).toEqual({ view: 'paths', scope: '/compass/staging/' });
  });

  it('turns an Other paths folder into the same folder', () => {
    const other: Location = { view: 'services', other: true, folder: '/x/' };
    expect(convert(other, 'paths', ctx)).toEqual({
      view: 'paths',
      scope: '/x/'
    });
    expect(convert({ ...other, folder: '' }, 'paths', ctx)).toEqual({
      view: 'paths',
      scope: ''
    });
  });

  it('reads a path folder at or below a service', () => {
    expect(
      convert(
        { view: 'paths', scope: '/development/compass/' },
        'services',
        ctx
      )
    ).toEqual(compassDev());
    expect(
      convert(
        { view: 'paths', scope: '/development/compass/AppServer/Dashboard/' },
        'services',
        ctx
      )
    ).toEqual(compassDev('AppServer/Dashboard/'));
  });

  it('keeps what a folder above the services names', () => {
    expect(
      convert({ view: 'paths', scope: '/staging/' }, 'services', ctx)
    ).toEqual({ view: 'services', service: '', env: 'staging', folder: '' });
    expect(
      convert({ view: 'paths', scope: '/billing/' }, 'services', svcFirst)
    ).toEqual({ view: 'services', service: 'billing', env: '', folder: '' });
    expect(convert({ view: 'paths', scope: '' }, 'services', ctx)).toEqual({
      view: 'services',
      service: '',
      env: '',
      folder: ''
    });
  });

  it('puts a folder that does not fit under Other paths', () => {
    expect(
      convert({ view: 'paths', scope: '/random/' }, 'services', ctx)
    ).toEqual({ view: 'services', other: true, folder: '/random/' });
    expect(
      convert({ view: 'paths', scope: '/production/compass/' }, 'services', ctx)
    ).toEqual({
      view: 'services',
      other: true,
      folder: '/production/compass/'
    });
  });

  it('comes back to the same place', () => {
    const start = compassDev('AppServer/');
    expect(convert(convert(start, 'paths', ctx), 'services', ctx)).toEqual(
      start
    );
  });
});

describe('rowsFor', () => {
  it('lists a service in one environment, below the folder', () => {
    expect(namesAt(compassDev())).toEqual([
      '/development/compass/AppServer/Dashboard/Title',
      '/development/compass/AppServer/Port',
      '/development/compass/Flag'
    ]);
    expect(namesAt(compassDev('AppServer/Dashboard/'))).toEqual([
      '/development/compass/AppServer/Dashboard/Title'
    ]);
  });

  it('lists exactly the names parse leaves out under Other paths', () => {
    const other = namesAt({ view: 'services', other: true, folder: '' });
    expect(other).toEqual(names.filter(n => !parse(n, structure, '/')));
    expect(other).toEqual([
      '/production/compass/Flag',
      '/random/thing',
      '/Root'
    ]);
  });

  it('lists a Paths folder by prefix, and everything at the root', () => {
    expect(namesAt({ view: 'paths', scope: '/production/' })).toEqual([
      '/production/compass/Flag',
      '/production/billing/Key'
    ]);
    expect(rowsFor({ view: 'paths', scope: '' }, rows, ctx)).toBe(rows);
  });

  it('agrees with contains', () => {
    expect(contains(compassDev(), '/staging/compass/AppServer/Port', ctx)).toBe(
      false
    );
  });
});

describe('relativeFolder', () => {
  it('is the folder below the location', () => {
    const name = '/development/compass/AppServer/Dashboard/Title';
    expect(relativeFolder(compassDev(), name, ctx)).toBe(
      'AppServer/Dashboard/'
    );
    expect(relativeFolder(compassDev('AppServer/'), name, ctx)).toBe(
      'Dashboard/'
    );
    expect(
      relativeFolder({ view: 'paths', scope: '/development/' }, name, ctx)
    ).toBe('compass/AppServer/Dashboard/');
    expect(
      relativeFolder(
        { view: 'services', other: true, folder: '/random/' },
        '/random/a/b',
        ctx
      )
    ).toBe('a/');
  });
});

describe('pathFolderOf', () => {
  it('is the full folder for a new parameter', () => {
    expect(pathFolderOf(compassDev('AppServer/'), ctx)).toBe(
      '/development/compass/AppServer/'
    );
    expect(pathFolderOf({ view: 'paths', scope: '/a/' }, ctx)).toBe('/a/');
  });
});

describe('envFor', () => {
  const compass = structure.services[0]!;
  it('keeps the preferred environment, else the first in configured order', () => {
    expect(envFor(compass, 'staging', structure)).toBe('staging');
    expect(envFor(compass, 'production', structure)).toBe('development');
    expect(envFor(compass, null, structure)).toBe('development');
    // In the order of the environments, not of the service's list.
    expect(envFor(structure.services[1]!, null, structure)).toBe('staging');
    expect(
      envFor({ segment: 'none', environments: [] }, 'staging', structure)
    ).toBe('');
  });
});

describe('validate', () => {
  it('keeps a valid location as it is', () => {
    const location = compassDev('AppServer/');
    expect(validate(location, ctx, prefs)).toBe(location);
  });

  it('starts in the default view', () => {
    expect(validate(null, ctx, prefs)).toEqual(compassDev());
    expect(validate(null, ctx, { ...prefs, defaultView: 'paths' })).toEqual({
      view: 'paths',
      scope: ''
    });
    // Until the Environments view exists.
    expect(
      validate(null, ctx, { ...prefs, defaultView: 'environments' })
    ).toEqual(compassDev());
  });

  it('is always Paths with the switch off, at the same place', () => {
    const off = { ...ctx, structure: { ...structure, enabled: false } };
    expect(validate(null, off, prefs)).toEqual({ view: 'paths', scope: '' });
    expect(validate(compassDev('AppServer/'), off, prefs)).toEqual({
      view: 'paths',
      scope: '/development/compass/AppServer/'
    });
  });

  it('moves to the first service when the service was removed', () => {
    expect(
      validate(
        { view: 'services', service: 'gone', env: 'staging', folder: 'A/' },
        ctx,
        prefs
      )
    ).toEqual({ ...compassDev(), env: 'staging' });
  });

  it('moves to Other paths when no service is left', () => {
    const none = { ...ctx, structure: { ...structure, services: [] } };
    expect(validate(compassDev('A/'), none, prefs)).toEqual({
      view: 'services',
      other: true,
      folder: ''
    });
  });

  it('picks an environment the service is in, preferring the last one', () => {
    expect(
      validate({ ...compassDev('A/'), env: 'production' }, ctx, prefs)
    ).toEqual(compassDev('A/'));
    expect(
      validate(
        { view: 'services', service: 'compass', env: '', folder: '' },
        ctx,
        { ...prefs, lastEnv: 'staging' }
      )
    ).toEqual({ ...compassDev(), env: 'staging' });
  });
});

describe('tree keys', () => {
  it('names the node of a location and the nodes above it', () => {
    expect(treeKeyOf(compassDev('A/'))).toBe(serviceNodeKey('compass', 'A/'));
    expect(treeKeysTo(compassDev('A/B/'), ctx)).toEqual([
      serviceNodeKey('compass'),
      serviceNodeKey('compass', 'A/'),
      serviceNodeKey('compass', 'A/B/')
    ]);
    expect(
      treeKeysTo({ view: 'services', other: true, folder: '/x/' }, ctx)
    ).toEqual([otherNodeKey(), otherNodeKey('/x/')]);
    expect(treeKeysTo({ view: 'paths', scope: '/a/b/' }, ctx)).toEqual([
      '/a/',
      '/a/b/'
    ]);
  });
});
