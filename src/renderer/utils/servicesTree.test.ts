import { describe, expect, it } from 'vitest';
import { DEFAULT_STRUCTURE } from '../../shared/structure';
import type { Structure } from '../../shared/structure';
import { buildEnvironmentsTree, buildServicesTree } from './servicesTree';
import type { SidebarNode } from './servicesTree';

const structure: Structure = {
  ...DEFAULT_STRUCTURE,
  enabled: true,
  services: [
    { segment: 'compass', environments: ['development', 'staging'] },
    { segment: 'billing', environments: ['production'] }
  ]
};
const ctx = { structure, delimiter: '/' };

const names = [
  '/development/compass/AppServer/Port',
  '/development/compass/Flag',
  '/staging/compass/AppServer/Port',
  '/staging/compass/Workers/Max',
  '/random/a/thing'
];

const summary = (node: SidebarNode): unknown => [
  node.label,
  node.count,
  ...(node.children.length ? [node.children.map(summary)] : [])
];

describe('buildServicesTree', () => {
  it('builds each service from the keys of all its environments', () => {
    const tree = buildServicesTree(names, ctx, null, false);
    expect(tree.services.map(summary)).toEqual([
      // Counted in development, the first environment.
      [
        'compass',
        2,
        [
          ['AppServer', 1],
          ['Workers', 0]
        ]
      ],
      ['billing', 0]
    ]);
    expect(summary(tree.other!)).toEqual([
      'Other paths',
      1,
      [['random', 1, [['a', 1]]]]
    ]);
  });

  it('counts in the preferred environment where the service is in it', () => {
    const tree = buildServicesTree(names, ctx, 'staging', false);
    expect(tree.services.map(summary)[0]).toEqual([
      'compass',
      2,
      [
        ['AppServer', 1],
        ['Workers', 1]
      ]
    ]);
    expect(tree.services[0]!.location).toEqual({
      view: 'services',
      service: 'compass',
      env: 'staging',
      folder: ''
    });
  });

  it('counts the selected service in the environment shown', () => {
    const tree = buildServicesTree(names, ctx, 'staging', false, {
      service: 'compass',
      env: 'development'
    });
    expect(tree.services.map(summary)[0]).toEqual([
      'compass',
      2,
      [
        ['AppServer', 1],
        ['Workers', 0]
      ]
    ]);
    expect(tree.services[0]!.children[0]!.location).toMatchObject({
      env: 'development'
    });
  });

  it('leaves out what has no matches while searching', () => {
    const tree = buildServicesTree(names.slice(0, 1), ctx, null, true);
    expect(tree.services.map(s => s.label)).toEqual(['compass']);
    expect(tree.other).toBeNull();
  });

  it('lists the nodes with children for expanding', () => {
    const tree = buildServicesTree(names, ctx, null, false);
    expect(tree.keys).toHaveLength(3);
    expect(tree.keys).toContain(tree.services[0]!.key);
    expect(tree.keys).not.toContain(tree.services[1]!.key);
  });
});

describe('buildEnvironmentsTree', () => {
  it('lists each environment with the services in it and their folders', () => {
    const tree = buildEnvironmentsTree(names, ctx, false);
    expect(tree.environments.map(summary)).toEqual([
      ['development', 2, [['compass', 2, [['AppServer', 1]]]]],
      [
        'staging',
        2,
        [
          [
            'compass',
            2,
            [
              ['AppServer', 1],
              ['Workers', 1]
            ]
          ]
        ]
      ],
      ['production', 0, [['billing', 0]]]
    ]);
    expect(summary(tree.other!)).toEqual([
      'Other paths',
      1,
      [['random', 1, [['a', 1]]]]
    ]);
    expect(tree.environments[1]!.children[0]!.children[1]!.location).toEqual({
      view: 'environments',
      env: 'staging',
      service: 'compass',
      folder: 'Workers/'
    });
    expect(tree.other!.location).toEqual({
      view: 'environments',
      other: true,
      folder: ''
    });
  });

  it('leaves out what has no matches while searching', () => {
    const tree = buildEnvironmentsTree(names.slice(0, 1), ctx, true);
    expect(tree.environments.map(summary)).toEqual([
      ['development', 1, [['compass', 1, [['AppServer', 1]]]]]
    ]);
    expect(tree.other).toBeNull();
  });
});
