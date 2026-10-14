// Parameter names are paths split by the path delimiter setting. A folder is a
// name prefix that ends with the delimiter, such as '/app/db/'. The empty
// string stands for "all parameters".

export const leafOf = (name, delimiter) => {
  const index = name.lastIndexOf(delimiter);
  return index < 0 ? name : name.slice(index + delimiter.length);
};

export const folderOf = (name, delimiter) => {
  const index = name.lastIndexOf(delimiter);
  return index < 0 ? '' : name.slice(0, index + delimiter.length);
};

// Every folder that contains `name`, outermost first. A leading delimiter is
// the root and not a folder of its own: '/a/b/c' → ['/a/', '/a/b/'].
export const foldersOf = (name, delimiter) => {
  const folders = [];
  if (!delimiter) return folders;
  let index = name.indexOf(delimiter, 1);
  while (index > 0) {
    folders.push(name.slice(0, index + delimiter.length));
    index = name.indexOf(delimiter, index + delimiter.length);
  }
  return folders;
};

// The folder's last segment without the trailing delimiter.
export const folderLabel = (folder, delimiter) =>
  leafOf(folder.slice(0, -delimiter.length), delimiter);

// The folder and its ancestors as { key, label }, outermost first.
export const folderChain = (folder, delimiter) =>
  foldersOf(folder, delimiter).map(key => ({
    key,
    label: folderLabel(key, delimiter)
  }));

// The last two segments of a folder for compact display: '…/AppServer/Dashboard'.
export const shortFolder = (folder, delimiter) => {
  const chain = folderChain(folder, delimiter);
  const tail = chain
    .slice(-2)
    .map(f => f.label)
    .join(delimiter);
  if (chain.length > 2) return `…${delimiter}${tail}`;
  return folder.startsWith(delimiter) ? `${delimiter}${tail}` : tail;
};

// Where new parameters go when no folder is picked. SSM paths start with '/',
// so that delimiter gets a root folder; other delimiters have no root prefix.
export const rootFolder = delimiter => (delimiter === '/' ? '/' : '');

// Builds the folder hierarchy of `names`. Each node is
// { key, label, count, children } where `count` is the number of names
// anywhere beneath the folder. Nodes are sorted by label.
export const buildFolderTree = (names, delimiter) => {
  const nodes = new Map();
  const roots = [];

  names.forEach(name => {
    let parent = null;
    foldersOf(name, delimiter).forEach(key => {
      let node = nodes.get(key);
      if (!node) {
        node = {
          key,
          label: folderLabel(key, delimiter),
          count: 0,
          children: []
        };
        nodes.set(key, node);
        (parent ? parent.children : roots).push(node);
      }
      node.count += 1;
      parent = node;
    });
  });

  const sort = list => {
    list.sort((a, b) => a.label.localeCompare(b.label));
    list.forEach(node => sort(node.children));
    return list;
  };

  return { roots: sort(roots), keys: [...nodes.keys()] };
};
