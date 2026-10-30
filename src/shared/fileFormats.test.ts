import { describe, expect, it } from 'vitest';
import { saveFileContract } from '../main/endpoints/files/saveFile/saveFile.contract';
import { extensionOf, formatOfFileName } from './fileFormats';

describe('file formats', () => {
  it('reads the format from a file name', () => {
    expect(formatOfFileName('export.csv')).toBe('csv');
    expect(formatOfFileName('EXPORT.JSON')).toBe('json');
    expect(formatOfFileName('export.txt')).toBeUndefined();
    expect(formatOfFileName('export')).toBeUndefined();
  });

  it('gives the extension', () => {
    expect(extensionOf('json')).toBe('.json');
  });

  it('lets the save contract accept only known formats without a path', () => {
    const valid = (fileName: string) =>
      saveFileContract.request.safeParse({ fileName, content: '' }).success;
    expect(valid('a.csv')).toBe(true);
    expect(valid('a.json')).toBe(true);
    expect(valid('a.txt')).toBe(false);
    expect(valid('dir/a.csv')).toBe(false);
    expect(valid('dir\\a.csv')).toBe(false);
  });
});
