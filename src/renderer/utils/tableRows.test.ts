import { describe, expect, it } from 'vitest';
import { DEFAULT_STRUCTURE } from '../../shared/structure';
import type { Structure } from '../../shared/structure';
import { makeParameter } from '../test/testState';
import { isGroupRow, tableRowsOf } from './tableRows';

const structure: Structure = {
  ...DEFAULT_STRUCTURE,
  enabled: true,
  services: [
    { segment: 'billing', environments: ['development'] },
    { segment: 'compass', environments: ['development'] }
  ]
};
const ctx = { structure, delimiter: '/' };
const parameters = [
  makeParameter('/development/compass/A'),
  makeParameter('/development/billing/B'),
  makeParameter('/development/compass/C')
];

describe('tableRowsOf', () => {
  it('puts a header row before each service of a whole environment', () => {
    const rows = tableRowsOf(
      parameters,
      { view: 'environments', env: 'development', service: null, folder: '' },
      ctx
    );
    expect(
      rows.map(r => (isGroupRow(r) ? [r.service, r.count] : r.Name))
    ).toEqual([
      ['billing', 1],
      '/development/billing/B',
      ['compass', 2],
      '/development/compass/A',
      '/development/compass/C'
    ]);
  });

  it('lists the parameters as they are elsewhere', () => {
    const location = { view: 'paths', scope: '' } as const;
    expect(tableRowsOf(parameters, location, ctx)).toBe(parameters);
  });
});
