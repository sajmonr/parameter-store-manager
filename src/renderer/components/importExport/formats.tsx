// The file formats of the Import & export page. The page is built from this
// list, so a format is added here and in the code that writes and reads it.
import type { ReactNode } from 'react';
import { CodeOutlined, FileTextOutlined } from '@ant-design/icons';
import type { FormatId } from '../../state/export';
import { parseCsvExport } from '../../utils/csv';
import type { ParseResult } from '../../utils/importFile';
import { parseJsonExport } from '../../utils/jsonExport';

export type Format = {
  id: FormatId;
  label: string;
  icon: ReactNode;
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
    label: 'CSV',
    icon: <FileTextOutlined />,
    description: 'For spreadsheets and review.',
    canExport: true,
    canImport: true,
    parse: parseCsvExport,
    exportOptions: 'columns'
  },
  {
    id: 'json',
    label: 'JSON',
    icon: <CodeOutlined />,
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
