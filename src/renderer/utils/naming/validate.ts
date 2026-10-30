// Whether typed text can name a parameter.
import { leafOf, rootFolder } from '../paths';
import type { NamingMode } from './types';

export const NAME_ERRORS = {
  spaces: 'spaces',
  // A character SSM doesn't allow in a name.
  characters: 'characters',
  // Structured mode: the key starts with the delimiter.
  leadingDelimiter: 'leadingDelimiter',
  // Path mode: the path doesn't start at the root.
  notRooted: 'notRooted',
  // An empty folder, from a doubled delimiter.
  emptySegment: 'emptySegment',
  // Nothing after the last delimiter. Shown only once the field loses focus,
  // since it's the normal state while drilling down into folders.
  noName: 'noName'
} as const;

export type NameError = (typeof NAME_ERRORS)[keyof typeof NAME_ERRORS];

// What SSM allows between delimiters.
const SEGMENT = /^[A-Za-z0-9_.-]+$/;

// Why the typed key or path can't name a parameter, or null when it can. An
// empty key has no error; it isn't ready either.
export const nameErrorOf = (
  text: string,
  mode: NamingMode,
  delimiter: string
): NameError | null => {
  if (/\s/.test(text)) return NAME_ERRORS.spaces;
  const segments = text.split(delimiter);
  if (segments.some(segment => segment && !SEGMENT.test(segment))) {
    return NAME_ERRORS.characters;
  }
  const root = rootFolder(delimiter);
  let rest = text;
  if (mode === 'structured') {
    if (text.startsWith(delimiter)) return NAME_ERRORS.leadingDelimiter;
  } else if (!text.startsWith(root)) {
    return NAME_ERRORS.notRooted;
  } else {
    rest = text.slice(root.length);
  }
  if (
    rest
      .split(delimiter)
      .slice(0, -1)
      .some(segment => !segment)
  ) {
    return NAME_ERRORS.emptySegment;
  }
  if (text && !leafOf(rest, delimiter)) return NAME_ERRORS.noName;
  return null;
};
