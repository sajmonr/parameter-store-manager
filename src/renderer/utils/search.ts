// The search box takes plain text or a glob. A query is a glob when it has a
// wildcard (* or ?) or starts with the path delimiter.

const escapeRegExp = (text: string) =>
  text.replace(/[.*+?^${}()|[\]\\/-]/g, '\\$&');

export const isGlobQuery = (query: string, delimiter: string) =>
  /[*?]/.test(query) || (!!delimiter && query.startsWith(delimiter));

// `**` matches any depth, including none: `a/**/b` matches `a/b`. `*` and `?`
// stay within one segment. A leading delimiter (or `anchored`) anchors at the
// start of the name, otherwise the glob may start at any segment boundary.
// Like a path prefix, the glob only has to match the beginning of the rest of
// the name, unless `whole` is set.
export const globToRegExp = (
  glob: string,
  delimiter: string,
  anchored = glob.startsWith(delimiter),
  whole = false
) => {
  const d = escapeRegExp(delimiter);
  const notDelimiter = delimiter.length === 1 ? `[^${d}]` : `(?:(?!${d}).)`;

  let source = '';
  for (let i = 0; i < glob.length; i += 1) {
    const char = glob.charAt(i);
    if (glob.startsWith(`**${delimiter}`, i)) {
      source += `(?:.*${d})?`;
      i += 1 + delimiter.length;
    } else if (char === '*' && glob[i + 1] === '*') {
      source += '.*';
      i += 1;
    } else if (char === '*') {
      source += `${notDelimiter}*`;
    } else if (char === '?') {
      source += notDelimiter;
    } else {
      source += escapeRegExp(char);
    }
  }

  const start = anchored ? '^' : `(?:^|${d})`;
  return new RegExp(start + source + (whole ? '$' : ''));
};

export interface Matcher {
  query: string;
  isGlob: boolean;
  test: (name: string) => boolean;
}

// Plain text is a case-insensitive substring match on the full name; an empty
// query matches everything.
export const createMatcher = (
  rawQuery: string | null | undefined,
  delimiter: string
): Matcher => {
  const query = (rawQuery || '').trim();
  if (!query) return { query, isGlob: false, test: () => true };

  if (isGlobQuery(query, delimiter)) {
    const regExp = globToRegExp(query, delimiter);
    return { query, isGlob: true, test: name => regExp.test(name) };
  }

  const lower = query.toLowerCase();
  return {
    query,
    isGlob: false,
    test: name => name.toLowerCase().includes(lower)
  };
};

// A name prefix, which may contain the same wildcards as the search. Unlike
// the search it always starts at the beginning of the name and, like SSM, is
// case-sensitive. An empty prefix matches everything.
export const createPrefixMatcher = (
  rawPrefix: string | null | undefined,
  delimiter: string
): Matcher => {
  const query = (rawPrefix || '').trim();
  if (!/[*?]/.test(query)) {
    return { query, isGlob: false, test: name => name.startsWith(query) };
  }
  const regExp = globToRegExp(query, delimiter, true);
  return { query, isGlob: true, test: name => regExp.test(name) };
};

// What an export takes: a path matches everything under it, and a glob must
// match the whole name. Like SSM, it is case-sensitive. An empty path matches
// everything.
export const createPathMatcher = (
  rawPath: string | null | undefined,
  delimiter: string
): Matcher => {
  const query = (rawPath || '').trim();
  if (!/[*?]/.test(query)) {
    return { query, isGlob: false, test: name => name.startsWith(query) };
  }
  const regExp = globToRegExp(query, delimiter, true, true);
  return { query, isGlob: true, test: name => regExp.test(name) };
};

// The part of a path before its first wildcard. AWS can filter names on it,
// and the glob is then applied to what comes back.
export const literalPrefix = (path: string) => path.trim().split(/[*?]/)[0]!;
