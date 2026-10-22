import { describe, expect, it } from 'vitest';
import { DEFAULT_STRUCTURE } from '../../shared/structure';
import type { Structure } from '../../shared/structure';
import {
  contains,
  convert,
  envFor,
  environmentNodeKey,
  locationInEnv,
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
import type {
  EnvironmentLocation,
  Location,
  LocationContext,
  ServiceLocation
} from './location';
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

const devEnv = (
  service: string | null = null,
  folder = ''
): EnvironmentLocation => ({
  view: 'environments',
  env: 'development',
  service,
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

  it('is the environment, service and key folder in the Environments view', () => {
    expect(
      locationOf('/development/compass/AppServer/Port', 'environments', ctx)
    ).toEqual(devEnv('compass', 'AppServer/'));
    expect(locationOf('/random/thing', 'environments', ctx)).toEqual({
      view: 'environments',
      other: true,
      folder: '/random/'
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

  it('keeps the environment, service and folder from Services to Environments', () => {
    expect(convert(compassDev('AppServer/'), 'environments', ctx)).toEqual(
      devEnv('compass', 'AppServer/')
    );
  });

  it('keeps the service and folder from Environments to Services', () => {
    expect(convert(devEnv('compass', 'AppServer/'), 'services', ctx)).toEqual(
      compassDev('AppServer/')
    );
    // validate picks a service in the environment.
    expect(convert(devEnv(), 'services', ctx)).toEqual({
      view: 'services',
      service: '',
      env: 'development',
      folder: ''
    });
  });

  it('turns an Environments place into its path', () => {
    expect(convert(devEnv('compass', 'AppServer/'), 'paths', ctx)).toEqual({
      view: 'paths',
      scope: '/development/compass/AppServer/'
    });
    expect(convert(devEnv('compass'), 'paths', svcFirst)).toEqual({
      view: 'paths',
      scope: '/compass/development/'
    });
    // A whole environment is a folder only when environments come first.
    expect(convert(devEnv(), 'paths', ctx)).toEqual({
      view: 'paths',
      scope: '/development/'
    });
    expect(convert(devEnv(), 'paths', svcFirst)).toEqual({
      view: 'paths',
      scope: ''
    });
  });

  it('reads a path folder into the Environments view', () => {
    expect(
      convert(
        { view: 'paths', scope: '/development/compass/AppServer/' },
        'environments',
        ctx
      )
    ).toEqual(devEnv('compass', 'AppServer/'));
    expect(
      convert({ view: 'paths', scope: '/development/' }, 'environments', ctx)
    ).toEqual(devEnv());
    expect(
      convert({ view: 'paths', scope: '/billing/' }, 'environments', svcFirst)
    ).toEqual({
      view: 'environments',
      env: '',
      service: 'billing',
      folder: ''
    });
    expect(convert({ view: 'paths', scope: '' }, 'environments', ctx)).toEqual({
      view: 'environments',
      env: '',
      service: null,
      folder: ''
    });
    expect(
      convert({ view: 'paths', scope: '/random/' }, 'environments', ctx)
    ).toEqual({ view: 'environments', other: true, folder: '/random/' });
  });

  it('keeps an Other paths folder in every view', () => {
    const other: Location = { view: 'services', other: true, folder: '/x/' };
    const otherEnv = convert(other, 'environments', ctx);
    expect(otherEnv).toEqual({ ...other, view: 'environments' });
    expect(convert(otherEnv, 'services', ctx)).toEqual(other);
    expect(convert(otherEnv, 'paths', ctx)).toEqual({
      view: 'paths',
      scope: '/x/'
    });
  });

  it('comes back to the same place through every view', () => {
    const start = devEnv('compass', 'AppServer/');
    const viaServices = convert(start, 'services', ctx);
    const viaPaths = convert(viaServices, 'paths', ctx);
    expect(convert(viaPaths, 'environments', ctx)).toEqual(start);
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

  it('lists a whole environment by service, in the configured order', () => {
    const unsorted = [
      '/staging/compass/Zeta',
      '/staging/billing/B',
      '/staging/compass/Alpha',
      '/staging/billing/A',
      '/development/compass/Flag'
    ].map(Name => ({ Name }));
    const staging = { ...devEnv(), env: 'staging' };
    expect(rowsFor(staging, unsorted, ctx).map(r => r.Name)).toEqual([
      '/staging/compass/Alpha',
      '/staging/compass/Zeta',
      '/staging/billing/A',
      '/staging/billing/B'
    ]);
  });

  it('lists a service of an environment below the folder', () => {
    expect(namesAt(devEnv('compass', 'AppServer/'))).toEqual([
      '/development/compass/AppServer/Dashboard/Title',
      '/development/compass/AppServer/Port'
    ]);
    expect(namesAt({ view: 'environments', other: true, folder: '' })).toEqual(
      namesAt({ view: 'services', other: true, folder: '' })
    );
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
    expect(relativeFolder(devEnv(), name, ctx)).toBe('AppServer/Dashboard/');
    expect(relativeFolder(devEnv('compass', 'AppServer/'), name, ctx)).toBe(
      'Dashboard/'
    );
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

describe('locationInEnv', () => {
  const staging = '/staging/compass/AppServer/Port';

  it('changes the environment in the Services view', () => {
    expect(locationInEnv(compassDev('AppServer/'), staging, ctx)).toEqual({
      ...compassDev('AppServer/'),
      env: 'staging'
    });
  });

  it('moves a Paths folder of the service to that environment', () => {
    expect(
      locationInEnv(
        { view: 'paths', scope: '/development/compass/AppServer/' },
        staging,
        ctx
      )
    ).toEqual({ view: 'paths', scope: '/staging/compass/AppServer/' });
  });

  it('stays where the name is already listed', () => {
    expect(locationInEnv({ view: 'paths', scope: '' }, staging, ctx)).toEqual({
      view: 'paths',
      scope: ''
    });
  });

  it('moves an Environments place to that environment', () => {
    const devCompass: Location = {
      view: 'environments',
      env: 'development',
      service: 'compass',
      folder: 'AppServer/'
    };
    expect(locationInEnv(devCompass, staging, ctx)).toEqual({
      ...devCompass,
      env: 'staging'
    });
    expect(
      locationInEnv(
        { view: 'environments', env: 'development', service: null, folder: '' },
        staging,
        ctx
      )
    ).toEqual({
      view: 'environments',
      env: 'staging',
      service: null,
      folder: ''
    });
  });

  it('moves a Paths folder above the services to that environment', () => {
    expect(
      locationInEnv({ view: 'paths', scope: '/development/' }, staging, ctx)
    ).toEqual({ view: 'paths', scope: '/staging/' });
  });

  it("goes to the name's own place from anywhere else", () => {
    expect(
      locationInEnv(
        { ...compassDev(), service: 'billing', env: 'production' },
        staging,
        ctx
      )
    ).toEqual({ ...compassDev('AppServer/'), env: 'staging' });
    expect(
      locationInEnv({ view: 'paths', scope: '/random/' }, staging, ctx)
    ).toEqual({ view: 'paths', scope: '/staging/compass/AppServer/' });
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
    expect(
      validate(null, ctx, { ...prefs, defaultView: 'environments' })
    ).toEqual(devEnv());
  });

  it('is always Paths with the switch off, at the same place', () => {
    const off = { ...ctx, structure: { ...structure, enabled: false } };
    expect(validate(null, off, prefs)).toEqual({ view: 'paths', scope: '' });
    expect(validate(compassDev('AppServer/'), off, prefs)).toEqual({
      view: 'paths',
      scope: '/development/compass/AppServer/'
    });
  });

  it('prefers a service in the environment shown', () => {
    expect(
      validate(
        { view: 'services', service: '', env: 'production', folder: '' },
        ctx,
        prefs
      )
    ).toEqual({
      view: 'services',
      service: 'billing',
      env: 'production',
      folder: ''
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

describe('validate in the Environments view', () => {
  const envPrefs = { ...prefs, defaultView: 'environments' as const };

  it('keeps a valid location as it is', () => {
    const location = devEnv('compass', 'A/');
    expect(validate(location, ctx, envPrefs)).toBe(location);
    expect(validate(devEnv(), ctx, envPrefs)).toEqual(devEnv());
  });

  it('opens on the last environment, else the first', () => {
    expect(validate(null, ctx, { ...envPrefs, lastEnv: 'production' })).toEqual(
      { ...devEnv(), env: 'production' }
    );
  });

  it('shows the whole environment when the service was removed or is not in it', () => {
    expect(validate(devEnv('gone', 'A/'), ctx, envPrefs)).toEqual(devEnv());
    expect(validate(devEnv('billing', 'A/'), ctx, envPrefs)).toEqual(devEnv());
  });

  it('picks an environment the service is in when there is none', () => {
    expect(
      validate(
        { view: 'environments', env: '', service: 'billing', folder: '' },
        ctx,
        envPrefs
      )
    ).toEqual({
      view: 'environments',
      env: 'staging',
      service: 'billing',
      folder: ''
    });
    expect(
      validate({ ...devEnv(), env: 'gone' }, ctx, {
        ...envPrefs,
        lastEnv: 'staging'
      })
    ).toEqual({ ...devEnv(), env: 'staging' });
  });

  it('moves to Other paths when no environment is left', () => {
    const none = { ...ctx, structure: { ...structure, environments: [] } };
    expect(validate(devEnv(), none, envPrefs)).toEqual({
      view: 'environments',
      other: true,
      folder: ''
    });
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
    expect(treeKeyOf(devEnv())).toBe(environmentNodeKey('development'));
    expect(treeKeysTo(devEnv(), ctx)).toEqual([
      environmentNodeKey('development')
    ]);
    expect(treeKeysTo(devEnv('compass', 'A/'), ctx)).toEqual([
      environmentNodeKey('development'),
      environmentNodeKey('development', 'compass'),
      environmentNodeKey('development', 'compass', 'A/')
    ]);
  });
});
