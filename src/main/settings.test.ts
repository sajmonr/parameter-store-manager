import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_SETTINGS } from '../shared/availableSettings';
import { DEFAULT_STRUCTURE } from '../shared/structure';

const { dir } = vi.hoisted(() => ({ dir: { path: '' } }));

// electron-store needs Electron for its folder; conf is the same store with
// the folder given.
vi.mock('electron-store', async () => {
  const { default: Conf } = await import('conf');
  return {
    default: class extends Conf {
      constructor(options: object) {
        super({ ...options, cwd: dir.path, projectVersion: '1.0.0' });
      }
    }
  };
});

// A settings file written by a version from before the structure setting.
const OLD_FILE = {
  pathDelimiter: '/',
  ssmRegion: 'us-east-1',
  kmsRegion: 'us-east-1',
  profile: 'dev',
  theme: 'dark'
};

const load = async () => {
  vi.resetModules();
  return import('./settings');
};

beforeEach(() => {
  dir.path = mkdtempSync(join(tmpdir(), 'settings-test-'));
  writeFileSync(join(dir.path, 'config.json'), JSON.stringify(OLD_FILE));
});

afterAll(() => rmSync(dir.path, { recursive: true, force: true }));

describe('settings', () => {
  it('loads an old settings file with the new defaults', async () => {
    const { getAllSettings } = await load();
    expect(getAllSettings()).toEqual({
      ...OLD_FILE,
      structure: DEFAULT_STRUCTURE,
      defaultView: DEFAULT_SETTINGS.defaultView
    });
  });

  it('reads a colour that is not hex as green', async () => {
    writeFileSync(
      join(dir.path, 'config.json'),
      JSON.stringify({
        ...OLD_FILE,
        structure: {
          ...DEFAULT_STRUCTURE,
          environments: [
            { segment: 'development', color: 'gold' },
            { segment: 'staging', color: '#123abc' }
          ]
        }
      })
    );
    const { getAllSettings, getSetting } = await load();
    const expected = [
      { segment: 'development', color: '#52c41a' },
      { segment: 'staging', color: '#123abc' }
    ];
    expect(getAllSettings().structure.environments).toEqual(expected);
    expect(getSetting('structure').environments).toEqual(expected);
  });

  it('saves a structure', async () => {
    const { getAllSettings, setSettings } = await load();
    const structure = {
      ...DEFAULT_STRUCTURE,
      enabled: true,
      services: [{ segment: 'compass', environments: ['development'] }]
    };
    setSettings({ structure });
    expect(getAllSettings().structure).toEqual(structure);
  });

  it('rejects segments that contain the delimiter', async () => {
    const { getAllSettings, setSettings } = await load();
    expect(() => setSettings({ pathDelimiter: 'e' })).toThrow(
      'Environment "development": Can\'t contain "e".'
    );
    expect(() =>
      setSettings({
        structure: {
          ...DEFAULT_STRUCTURE,
          services: [{ segment: 'a/b', environments: [] }]
        }
      })
    ).toThrow('Service "a/b": Can\'t contain "/".');
    expect(getAllSettings().pathDelimiter).toBe('/');
    expect(getAllSettings().structure).toEqual(DEFAULT_STRUCTURE);
  });

  it('saves other settings with an unchanged delimiter that clashes', async () => {
    writeFileSync(
      join(dir.path, 'config.json'),
      JSON.stringify({ ...OLD_FILE, pathDelimiter: 'e' })
    );
    const { getAllSettings, setSettings } = await load();
    setSettings({ pathDelimiter: 'e', theme: 'light' });
    expect(getAllSettings().theme).toBe('light');
    expect(() =>
      setSettings({ structure: { ...DEFAULT_STRUCTURE, enabled: true } })
    ).toThrow('Environment "development": Can\'t contain "e".');
  });
});
