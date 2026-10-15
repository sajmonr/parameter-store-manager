// The search box takes plain text or a glob. A query is a glob when it has a
// wildcard (* or ?) or starts with the path delimiter.

const escapeRegExp = text => text.replace(/[.*+?^${}()|[\]\\/-]/g, '\\$&');

export const isGlobQuery = (query, delimiter) =>
  /[*?]/.test(query) || (!!delimiter && query.startsWith(delimiter));

// `**` matches any depth, including none: `a/**/b` matches `a/b`. `*` and `?`
// stay within one segment. A leading delimiter anchors at the start of the
// name, otherwise the glob may start at any segment boundary. Like a path
// prefix, the glob only has to match the beginning of the rest of the name.
export const globToRegExp = (glob, delimiter) => {
  const d = escapeRegExp(delimiter);
  const notDelimiter = delimiter.length === 1 ? `[^${d}]` : `(?:(?!${d}).)`;

  let source = '';
  for (let i = 0; i < glob.length; i += 1) {
    const char = glob[i];
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

  const start = glob.startsWith(delimiter) ? '^' : `(?:^|${d})`;
  return new RegExp(start + source);
};

// Returns { query, isGlob, test(name) }. Plain text is a case-insensitive
// substring match on the full name; an empty query matches everything.
export const createMatcher = (rawQuery, delimiter) => {
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
