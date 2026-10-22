import { describe, expect, it } from 'vitest';
import { DEFAULT_STRUCTURE } from '../../shared/structure';
import type { Structure } from '../../shared/structure';
import {
  countAt,
  environmentColorOf,
  layoutPattern,
  parse,
  pathOf,
  structureNames
} from './structure';

const structure: Structure = {
  ...DEFAULT_STRUCTURE,
  enabled: true,
  services: [
    {
      segment: 'compass',
      environments: ['development', 'staging', 'production']
    },
    { segment: 'assessment', environments: ['development', 'staging'] }
  ]
};
const svcFirst: Structure = { ...structure, layout: 'svc-first' };

describe('parse', () => {
  it('reads /{environment}/{service}/… with the environment convention', () => {
    expect(
      parse('/development/compass/ConnectionStrings/Db', structure, '/')
    ).toEqual({
      env: 'development',
      service: 'compass',
      key: 'ConnectionStrings/Db'
    });
  });

  it('reads /{service}/{environment}/… with the services convention', () => {
    expect(parse('/compass/production/Title', svcFirst, '/')).toEqual({
      env: 'production',
      service: 'compass',
      key: 'Title'
    });
    expect(parse('/production/compass/Title', svcFirst, '/')).toBeNull();
  });

  it('returns null for an unknown environment or service', () => {
    expect(parse('/qa/compass/Title', structure, '/')).toBeNull();
    expect(parse('/development/billing/Title', structure, '/')).toBeNull();
  });

  it("returns null when the service isn't in that environment", () => {
    expect(parse('/production/assessment/Title', structure, '/')).toBeNull();
    expect(parse('/staging/assessment/Title', structure, '/')).not.toBeNull();
  });

  it('returns null for paths without a key', () => {
    expect(parse('/development/compass', structure, '/')).toBeNull();
    expect(parse('/development', structure, '/')).toBeNull();
    expect(parse('plain', structure, '/')).toBeNull();
  });

  it('returns null for empty segments other than the root', () => {
    expect(parse('/development//compass/Title', structure, '/')).toBeNull();
    expect(parse('/development/compass//Title', structure, '/')).toBeNull();
    expect(parse('/development/compass/Title/', structure, '/')).toBeNull();
    expect(parse('development/compass/Title', structure, '/')).toBeNull();
  });

  it('returns null while the structure is off', () => {
    const off = { ...structure, enabled: false };
    expect(parse('/development/compass/Title', off, '/')).toBeNull();
  });

  it('uses the configured delimiter, which has no root folder', () => {
    expect(parse('development.compass.App.Title', structure, '.')).toEqual({
      env: 'development',
      service: 'compass',
      key: 'App.Title'
    });
    expect(parse('.development.compass.Title', structure, '.')).toBeNull();
    expect(parse('/development/compass/Title', structure, '.')).toBeNull();
  });
});

describe('pathOf', () => {
  it('builds the name for either convention', () => {
    expect(pathOf('staging', 'compass', 'App/Title', structure, '/')).toBe(
      '/staging/compass/App/Title'
    );
    expect(pathOf('staging', 'compass', 'App/Title', svcFirst, '/')).toBe(
      '/compass/staging/App/Title'
    );
    expect(pathOf('staging', 'compass', 'Title', structure, '.')).toBe(
      'staging.compass.Title'
    );
  });

  it('builds folder paths from folder keys', () => {
    expect(pathOf('staging', 'compass', 'App/', structure, '/')).toBe(
      '/staging/compass/App/'
    );
    expect(pathOf('staging', 'compass', '', structure, '/')).toBe(
      '/staging/compass/'
    );
  });

  it('is the inverse of parse for every name that matches', () => {
    const cases: [string, Structure, string][] = [
      ['/development/compass/ConnectionStrings/Db', structure, '/'],
      ['/staging/assessment/Title', structure, '/'],
      ['/compass/production/A/B/C', svcFirst, '/'],
      ['development.compass.App.Title', structure, '.'],
      ['development::compass::Title', structure, '::']
    ];
    cases.forEach(([name, config, delimiter]) => {
      const match = parse(name, config, delimiter);
      expect(match).not.toBeNull();
      const { env, service, key } = match!;
      expect(pathOf(env, service, key, config, delimiter)).toBe(name);
    });
  });

  // Why segmentError rejects 'dev.' with '..': its path wouldn't parse back.
  it("can't be inverted for segments that end with the start of the delimiter", () => {
    const dotted: Structure = {
      ...structure,
      environments: [{ segment: 'dev.', color: '#52c41a' }],
      services: [{ segment: 'compass', environments: ['dev.'] }]
    };
    const name = pathOf('dev.', 'compass', 'Title', dotted, '..');
    expect(name).toBe('dev...compass..Title');
    expect(parse(name, dotted, '..')).toBeNull();
  });
});

describe('structureNames', () => {
  const names = [
    '/development/compass/A',
    '/development/compass/B/C',
    '/staging/compass/A',
    '/development/assessment/A',
    '/production/assessment/A',
    '/production/assessment/B',
    '/random/thing',
    '/qa/compass/A'
  ];

  it('matches and counts in one pass', () => {
    const result = structureNames(names, structure, '/');
    expect(result.matches.get('/development/compass/B/C')).toEqual({
      env: 'development',
      service: 'compass',
      key: 'B/C'
    });
    expect(result.other).toEqual([
      '/production/assessment/A',
      '/production/assessment/B',
      '/random/thing',
      '/qa/compass/A'
    ]);
    expect(Object.fromEntries(result.byEnv)).toEqual({
      development: 3,
      staging: 1
    });
    expect(Object.fromEntries(result.byService)).toEqual({
      compass: 3,
      assessment: 1
    });
    expect(countAt(result.byServiceEnv, 'compass', 'development')).toBe(2);
    expect(countAt(result.byServiceEnv, 'compass', 'production')).toBe(0);
  });

  it('counts unchecked combinations under Other paths', () => {
    const result = structureNames(names, structure, '/');
    expect(countAt(result.inOther, 'assessment', 'production')).toBe(2);
    expect(countAt(result.inOther, 'compass', 'qa')).toBe(0);
  });

  it('puts every name under Other paths while the structure is off', () => {
    const result = structureNames(names, { ...structure, enabled: false }, '/');
    expect(result.matches.size).toBe(0);
    expect(result.other).toEqual(names);
    expect(result.inOther.size).toBe(0);
  });
});

describe('layoutPattern', () => {
  it('shows the layout as a path', () => {
    expect(layoutPattern('env-first', '/')).toBe('/{environment}/{service}/…');
    expect(layoutPattern('svc-first', '.')).toBe('{service}.{environment}.…');
  });
});

describe('environmentColorOf', () => {
  const green = structure.environments[0]!.color;
  it('colours top-level environment folders with the environment convention', () => {
    expect(environmentColorOf('/development/', structure, '/')).toBe(green);
    expect(environmentColorOf('/development/compass/', structure, '/')).toBe(
      null
    );
    expect(environmentColorOf('/qa/', structure, '/')).toBe(null);
  });

  it("colours environment folders in a service's folder with the services convention", () => {
    expect(environmentColorOf('/compass/development/', svcFirst, '/')).toBe(
      green
    );
    expect(environmentColorOf('/development/', svcFirst, '/')).toBe(null);
    expect(environmentColorOf('/other/development/', svcFirst, '/')).toBe(null);
  });

  it('colours nothing with the switch off', () => {
    expect(
      environmentColorOf('/development/', { ...structure, enabled: false }, '/')
    ).toBe(null);
  });
});
