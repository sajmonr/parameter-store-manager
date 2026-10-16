import { describe, expect, it } from 'vitest';
import {
  buildFolderTree,
  folderChain,
  folderOf,
  foldersOf,
  leafOf,
  rootFolder,
  shortFolder
} from './paths';

describe('leafOf and folderOf', () => {
  it('split a name at the last delimiter', () => {
    expect(leafOf('/a/b/c', '/')).toBe('c');
    expect(folderOf('/a/b/c', '/')).toBe('/a/b/');
  });

  it('treat a name without delimiters as a leaf at the top', () => {
    expect(leafOf('plain', '/')).toBe('plain');
    expect(folderOf('plain', '/')).toBe('');
  });

  it('use the configured delimiter', () => {
    expect(leafOf('app.db.Password', '.')).toBe('Password');
    expect(folderOf('app.db.Password', '.')).toBe('app.db.');
  });
});

describe('foldersOf', () => {
  it('lists enclosing folders outermost first, without the root', () => {
    expect(foldersOf('/a/b/c', '/')).toEqual(['/a/', '/a/b/']);
  });

  it('works for names without a leading delimiter', () => {
    expect(foldersOf('a-b-c', '-')).toEqual(['a-', 'a-b-']);
  });

  it('includes the folder itself when given a folder', () => {
    expect(foldersOf('/a/b/', '/')).toEqual(['/a/', '/a/b/']);
  });

  it('returns nothing for top-level names', () => {
    expect(foldersOf('/a', '/')).toEqual([]);
    expect(foldersOf('a', '/')).toEqual([]);
  });
});

describe('folderChain and shortFolder', () => {
  it('labels each folder with its last segment', () => {
    expect(folderChain('/dev/app/db/', '/')).toEqual([
      { key: '/dev/', label: 'dev' },
      { key: '/dev/app/', label: 'app' },
      { key: '/dev/app/db/', label: 'db' }
    ]);
  });

  it('shortens deep folders to the last two segments', () => {
    expect(shortFolder('/dev/compass/AppServer/Dashboard/', '/')).toBe(
      '…/AppServer/Dashboard'
    );
    expect(shortFolder('/dev/compass/', '/')).toBe('/dev/compass');
    expect(shortFolder('dev.compass.', '.')).toBe('dev.compass');
  });
});

describe('rootFolder', () => {
  it('is / for slash paths and empty otherwise', () => {
    expect(rootFolder('/')).toBe('/');
    expect(rootFolder('.')).toBe('');
  });
});

describe('buildFolderTree', () => {
  it('builds sorted folders with counts of the names beneath them', () => {
    const { roots, keys } = buildFolderTree(
      ['/b/x', '/a/y/1', '/a/y/2', '/a/z', '/top'],
      '/'
    );
    expect(keys.sort()).toEqual(['/a/', '/a/y/', '/b/']);
    expect(roots).toEqual([
      {
        key: '/a/',
        label: 'a',
        count: 3,
        children: [{ key: '/a/y/', label: 'y', count: 2, children: [] }]
      },
      { key: '/b/', label: 'b', count: 1, children: [] }
    ]);
  });

  it('returns no folders for no names', () => {
    expect(buildFolderTree([], '/')).toEqual({ roots: [], keys: [] });
  });
});
