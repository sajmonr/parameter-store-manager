// Where the app reads parameters from: AWS, or in development a fake,
// local dataset (see main/source.ts).
export const DATA_SOURCES = ['aws', 'fake'] as const;
export type DataSource = (typeof DATA_SOURCES)[number];
