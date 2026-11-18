// The file formats exports are written in and imports read, by id (which is
// also the file extension) with their display names. The main process saves
// only these; the renderer builds the Import & export page from them.
export const FILE_FORMATS = { csv: 'CSV', json: 'JSON' } as const;
export type FormatId = keyof typeof FILE_FORMATS;
export const FORMAT_IDS = Object.keys(FILE_FORMATS) as FormatId[];

export const extensionOf = (format: FormatId) => `.${format}`;

// The format a file name's extension names, if any.
export const formatOfFileName = (fileName: string): FormatId | undefined => {
  const extension = fileName.split('.').pop()?.toLowerCase();
  return FORMAT_IDS.find(format => format === extension);
};
