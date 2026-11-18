import { describe, expect, it } from 'vitest';
import { DEFAULT_STRUCTURE } from '../../shared/structure';
import type { Structure } from '../../shared/structure';
import { parameterPlace } from './parameterPlace';

const structure: Structure = {
  ...DEFAULT_STRUCTURE,
  enabled: true,
  services: [{ segment: 'compass', environments: ['development', 'staging'] }]
};
const ctx = { structure, delimiter: '/' };

describe('parameterPlace', () => {
  it('lists the key in each environment of the service', () => {
    const place = parameterPlace(
      '/development/compass/Db',
      new Set(['/development/compass/Db']),
      ctx
    );
    expect(place).toMatchObject({
      env: 'development',
      service: 'compass',
      key: 'Db'
    });
    expect(place?.environments.map(e => [e.name, e.state])).toEqual([
      ['/development/compass/Db', 'current'],
      ['/staging/compass/Db', 'missing']
    ]);
  });

  it('marks environments that have the key', () => {
    const place = parameterPlace(
      '/staging/compass/Db',
      new Set(['/development/compass/Db', '/staging/compass/Db']),
      ctx
    );
    expect(place?.environments.map(e => e.state)).toEqual([
      'exists',
      'current'
    ]);
  });

  it('is null for a name under Other paths', () => {
    expect(parameterPlace('/random/Db', new Set(), ctx)).toBeNull();
  });
});
