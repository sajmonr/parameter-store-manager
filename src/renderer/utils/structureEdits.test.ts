import { describe, expect, it } from 'vitest';
import { DEFAULT_STRUCTURE, ENVIRONMENT_COLORS } from '../../shared/structure';
import type { Structure } from '../../shared/structure';
import {
  addEnvironment,
  addService,
  moveEnvironment,
  nextColor,
  removeEnvironment,
  removeService,
  renameEnvironment,
  setEnvironmentColor,
  setServiceEnvironment
} from './structureEdits';

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

const segments = (s: Structure) => s.environments.map(e => e.segment);

describe('nextColor', () => {
  it('picks the first preset no environment uses', () => {
    expect(nextColor(structure)).toBe('#1677ff');
    expect(
      nextColor({
        ...structure,
        environments: [{ segment: 'a', color: '#FAAD14' }]
      })
    ).toBe('#52c41a');
  });

  it('repeats the presets once all are used', () => {
    const environments = ENVIRONMENT_COLORS.map(color => ({
      segment: color,
      color
    }));
    expect(nextColor({ ...structure, environments })).toBe('#52c41a');
  });
});

describe('environments', () => {
  it('adds one at the end', () => {
    const next = addEnvironment(structure, 'qa', '#1677ff');
    expect(next.environments.at(-1)).toEqual({
      segment: 'qa',
      color: '#1677ff'
    });
    expect(next.services).toEqual(structure.services);
  });

  it('renames one in every service', () => {
    const next = renameEnvironment(structure, 'staging', 'stage');
    expect(segments(next)).toEqual(['development', 'stage', 'production']);
    expect(next.environments[1]!.color).toBe('#faad14');
    expect(next.services.map(s => s.environments)).toEqual([
      ['development', 'stage', 'production'],
      ['development', 'stage']
    ]);
  });

  it('removes one from every service', () => {
    const next = removeEnvironment(structure, 'development');
    expect(segments(next)).toEqual(['staging', 'production']);
    expect(next.services.map(s => s.environments)).toEqual([
      ['staging', 'production'],
      ['staging']
    ]);
  });

  it('moves one to where another is', () => {
    expect(
      segments(moveEnvironment(structure, 'production', 'development'))
    ).toEqual(['production', 'development', 'staging']);
    expect(
      segments(moveEnvironment(structure, 'development', 'staging'))
    ).toEqual(['staging', 'development', 'production']);
    expect(moveEnvironment(structure, 'qa', 'staging')).toBe(structure);
  });

  it('sets the colour of one', () => {
    const next = setEnvironmentColor(structure, 'staging', '#123abc');
    expect(next.environments.map(e => e.color)).toEqual([
      '#52c41a',
      '#123abc',
      '#f5222d'
    ]);
  });
});

describe('services', () => {
  it('adds one in every environment', () => {
    expect(addService(structure, 'notifications').services.at(-1)).toEqual({
      segment: 'notifications',
      environments: ['development', 'staging', 'production']
    });
  });

  it('removes one', () => {
    expect(
      removeService(structure, 'compass').services.map(s => s.segment)
    ).toEqual(['assessment']);
  });

  it('checks a combination in environment order', () => {
    const next = setServiceEnvironment(
      structure,
      'assessment',
      'production',
      true
    );
    expect(next.services[1]!.environments).toEqual([
      'development',
      'staging',
      'production'
    ]);
    const first = setServiceEnvironment(
      { ...structure, services: [{ segment: 'x', environments: ['staging'] }] },
      'x',
      'development',
      true
    );
    expect(first.services[0]!.environments).toEqual(['development', 'staging']);
  });

  it('unchecks a combination', () => {
    const next = setServiceEnvironment(structure, 'compass', 'staging', false);
    expect(next.services[0]!.environments).toEqual([
      'development',
      'production'
    ]);
    expect(next.services[1]).toBe(structure.services[1]);
  });
});
