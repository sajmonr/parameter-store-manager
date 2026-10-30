// The file formats of the Import & export page. The page is built from this
// list, so a format is added here and in the code that writes and reads it.
// Their icons are in components/importExport/formatIcons.
import { FILE_FORMATS } from '../../shared/fileFormats';
import type { FormatId } from '../../shared/fileFormats';
import { parseCsvExport } from './csv';
import type { ParseResult } from './importFile';
import { parseJsonExport } from './jsonExport';

export type Format = {
  id: FormatId;
  label: string;
  description: string;
  canExport: boolean;
  // columns: the export shows the columns it writes. fixed: it always writes
  // every field Import needs.
  exportOptions: 'columns' | 'fixed';
} & (
  | { canImport: true; parse: (text: string) => ParseResult }
  | { canImport: false; parse?: undefined }
);

export const FORMATS: Format[] = [
  {
    id: 'csv',
    label: FILE_FORMATS.csv,
    description: 'For spreadsheets and review.',
    canExport: true,
    canImport: true,
    parse: parseCsvExport,
    exportOptions: 'columns'
  },
  {
    id: 'json',
    label: FILE_FORMATS.json,
    description: 'For structured backups and restores.',
    canExport: true,
    canImport: true,
    parse: parseJsonExport,
    exportOptions: 'fixed'
  }
];

export const formatById = (id: FormatId) =>
  FORMATS.find(format => format.id === id)!;

export type Mode = 'export' | 'import';

export const isAvailable = (format: Format, mode: Mode) =>
  mode === 'export' ? format.canExport : format.canImport;
