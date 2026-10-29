import { describe, expect, it } from 'vitest';
import { DEFAULT_STRUCTURE } from '../../shared/structure';
import type { Structure } from '../../shared/structure';
import type { LocationContext } from './location';
import {
  envsForService,
  folderSet,
  initialNaming,
  isValueValid,
  MAX_VALUE_LENGTH,
  missingFolders,
  nameErrorOf,
  suggestionsFor,
  targetsOf,
  toPath,
  toStructured
} from './newParameter';
import type { Naming } from './newParameter';

const structure: Structure = {
  ...DEFAULT_STRUCTURE,
  enabled: true,
  services: [
    { segment: 'compass', environments: ['development', 'staging'] },
    { segment: 'billing', environments: ['staging', 'production'] }
  ]
};
const ctx: LocationContext = { structure, delimiter: '/' };
const svcFirst: LocationContext = {
  structure: { ...structure, layout: 'svc-first' },
  delimiter: '/'
};

const folders = folderSet(
  [
    '/development/compass/AppServer/Workers/Max',
    '/development/compass/AppServer/Port',
    '/staging/compass/Api/Url',
    '/staging/compass/AppServer/Port',
    '/random/Thing'
  ],
  '/'
);

const structured = (values: Partial<Naming> = {}): Naming => ({
  mode: 'structured',
  service: 'compass',
  envs: ['development'],
  key: '',
  path: '',
  ...values
});
const pathMode = (path: string): Naming => ({
  ...structured(),
  mode: 'path',
  path
});

describe('nameErrorOf', () => {
  const key = (text: string) => nameErrorOf(text, 'structured', '/');
  const path = (text: string) => nameErrorOf(text, 'path', '/');

  it('accepts keys and paths SSM allows', () => {
    expect(key('AppServer/Db_host-1.primary')).toBe(null);
    expect(path('/development/compass/Port')).toBe(null);
    expect(key('')).toBe(null);
  });

  it('checks in order: spaces, characters, leading or missing root, empty folders', () => {
    expect(key('a b#')).toBe('spaces');
    expect(key('/Key#')).toBe('characters');
    expect(key('naïve')).toBe('characters');
    expect(key('/AppServer/Port')).toBe('leadingDelimiter');
    expect(path('development/Port')).toBe('notRooted');
    expect(key('AppServer//Port')).toBe('emptySegment');
    expect(path('//Port')).toBe('emptySegment');
  });

  it('needs a name after the last delimiter', () => {
    expect(key('AppServer/')).toBe('noName');
    expect(path('/')).toBe('noName');
    expect(path('/development/')).toBe('noName');
  });

  it('uses the configured delimiter', () => {
    expect(nameErrorOf('app.cache.Ttl', 'path', '.')).toBe(null);
    expect(nameErrorOf('app..Ttl', 'path', '.')).toBe('emptySegment');
    expect(nameErrorOf('a/b', 'path', '.')).toBe('characters');
  });
});

describe('targetsOf', () => {
  it('names the key in each selected environment, in the configured order', () => {
    expect(
      targetsOf(
        structured({ envs: ['staging', 'development'], key: 'Port' }),
        ctx
      )
    ).toEqual(['/development/compass/Port', '/staging/compass/Port']);
  });

  it('follows the services convention', () => {
    expect(targetsOf(structured({ key: 'Port' }), svcFirst)).toEqual([
      '/compass/development/Port'
    ]);
  });

  it('is the path in path mode', () => {
    expect(targetsOf(pathMode('/a/b'), ctx)).toEqual(['/a/b']);
  });
});

describe('suggestionsFor', () => {
  const children = (text: string, naming: Naming) =>
    suggestionsFor(text, naming, folders, ctx).map(s => s.parent + s.child);

  it('lists the service folders in any environment', () => {
    expect(children('', structured())).toEqual(['Api/', 'AppServer/']);
    expect(children('ap', structured())).toEqual(['Api/', 'AppServer/']);
    expect(children('AppServer/', structured())).toEqual([
      'AppServer/Workers/'
    ]);
  });

  it('leaves out an exact match and other levels', () => {
    expect(children('AppServer', structured())).toEqual([]);
    expect(children('AppServer/W', structured())).toEqual([
      'AppServer/Workers/'
    ]);
    expect(children('Nothing/', structured())).toEqual([]);
  });

  it('lists every folder in path mode', () => {
    expect(children('/', pathMode('/'))).toEqual([
      '/development/',
      '/random/',
      '/staging/'
    ]);
    expect(children('/development/compass/A', pathMode(''))).toEqual([
      '/development/compass/AppServer/'
    ]);
  });
});

describe('missingFolders', () => {
  it('lists only the folders that are missing', () => {
    expect(
      missingFolders('AppServer/Workers/Pool/Size', structured(), folders, ctx)
    ).toBe('Pool/');
    expect(missingFolders('New/Deep/', structured(), folders, ctx)).toBe(
      'New/Deep/'
    );
    expect(missingFolders('AppServer/Port', structured(), folders, ctx)).toBe(
      ''
    );
  });

  it('counts a folder missing in any selected environment', () => {
    const both = structured({ envs: ['development', 'staging'] });
    expect(missingFolders('AppServer/Workers/X', both, folders, ctx)).toBe(
      'Workers/'
    );
  });

  it('works on full paths', () => {
    expect(
      missingFolders(
        '/development/compass/Cache/Ttl',
        pathMode(''),
        folders,
        ctx
      )
    ).toBe('Cache/');
    expect(missingFolders('/new/Ttl', pathMode(''), folders, ctx)).toBe('new/');
    expect(missingFolders('/Ttl', pathMode(''), folders, ctx)).toBe('');
  });
});

describe('switching modes', () => {
  it('goes to the full path in the first selected environment', () => {
    const naming = structured({
      envs: ['development', 'staging'],
      key: 'AppServer/Port'
    });
    expect(toPath(naming, ctx).path).toBe(
      '/development/compass/AppServer/Port'
    );
  });

  it('reads the service, environment and key out of a path that fits', () => {
    expect(
      toStructured(pathMode('/staging/billing/Db/Host'), ctx)
    ).toMatchObject({
      mode: 'structured',
      service: 'billing',
      envs: ['staging'],
      key: 'Db/Host'
    });
    expect(toStructured(pathMode('/staging/billing/Db/'), ctx)).toMatchObject({
      service: 'billing',
      key: 'Db/'
    });
  });

  it('keeps the service and environments otherwise, with the last segment as the key', () => {
    expect(
      toStructured({ ...pathMode('/random/Thing'), envs: ['staging'] }, ctx)
    ).toMatchObject({
      mode: 'structured',
      service: 'compass',
      envs: ['staging'],
      key: 'Thing'
    });
  });
});

describe('initialNaming', () => {
  it('starts at the service, environment and folder', () => {
    expect(
      initialNaming(
        {
          view: 'services',
          service: 'billing',
          env: 'production',
          folder: 'Db/'
        },
        ctx,
        null
      )
    ).toMatchObject({
      mode: 'structured',
      service: 'billing',
      envs: ['production'],
      key: 'Db/'
    });
  });

  it('picks the first service in a whole environment', () => {
    expect(
      initialNaming(
        { view: 'environments', env: 'staging', service: null, folder: '' },
        ctx,
        null
      )
    ).toMatchObject({ mode: 'structured', service: 'compass', key: '' });
  });

  it('starts in path mode in Paths, Other paths and with grouping off', () => {
    expect(
      initialNaming({ view: 'paths', scope: '/a/' }, ctx, null)
    ).toMatchObject({ mode: 'path', path: '/a/' });
    expect(
      initialNaming(
        { view: 'services', other: true, folder: '/random/' },
        ctx,
        null
      )
    ).toMatchObject({ mode: 'path', path: '/random/' });
    expect(
      initialNaming(
        { view: 'paths', scope: '' },
        { ...ctx, structure: { ...structure, enabled: false } },
        null
      )
    ).toMatchObject({ mode: 'path', path: '/' });
  });

  it('duplicates into the source service and environment outside Paths', () => {
    const location = {
      view: 'services' as const,
      service: 'billing',
      env: 'production',
      folder: ''
    };
    expect(
      initialNaming(location, ctx, '/staging/compass/AppServer/Port')
    ).toMatchObject({
      mode: 'structured',
      service: 'compass',
      envs: ['staging'],
      key: 'AppServer/PortCopy'
    });
    expect(initialNaming(location, ctx, '/random/Thing')).toMatchObject({
      mode: 'path',
      path: '/random/ThingCopy'
    });
    expect(
      initialNaming(
        { view: 'paths', scope: '' },
        ctx,
        '/staging/compass/AppServer/Port'
      )
    ).toMatchObject({
      mode: 'path',
      path: '/staging/compass/AppServer/PortCopy'
    });
  });
});

describe('initialNaming with a target', () => {
  it('starts on the key in that environment, in any view', () => {
    const target = {
      service: 'compass',
      env: 'production',
      key: 'Integrations/Stripe/SecretKey'
    };
    expect(
      initialNaming({ view: 'paths', scope: '/a/' }, ctx, null, target)
    ).toEqual({
      mode: 'structured',
      service: 'compass',
      envs: ['production'],
      key: 'Integrations/Stripe/SecretKey',
      path: '/production/compass/Integrations/Stripe/SecretKey'
    });
  });
});

describe('envsForService', () => {
  it('keeps the environments the new service has, or picks its first', () => {
    expect(
      envsForService('billing', ['development', 'staging'], structure)
    ).toEqual(['staging']);
    expect(envsForService('billing', ['development'], structure)).toEqual([
      'staging'
    ]);
  });
});

describe('isValueValid', () => {
  it('needs a value within the limit', () => {
    expect(isValueValid('')).toBe(false);
    expect(isValueValid('x'.repeat(MAX_VALUE_LENGTH))).toBe(true);
    expect(isValueValid('x'.repeat(MAX_VALUE_LENGTH + 1))).toBe(false);
  });
});
