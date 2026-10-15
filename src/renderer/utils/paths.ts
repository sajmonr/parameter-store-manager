// Parameter names are paths split by the path delimiter setting. A folder is a
// name prefix that ends with the delimiter, such as '/app/db/'. The empty
// string stands for "all parameters".

export interface FolderNode {
  key: string;
  label: string;
  // The number of names anywhere beneath the folder.
  count: number;
  children: FolderNode[];
}

export const leafOf = (name: string, delimiter: string) => {
  const index = name.lastIndexOf(delimiter);
  return index < 0 ? name : name.slice(index + delimiter.length);
};

export const folderOf = (name: string, delimiter: string) => {
  const index = name.lastIndexOf(delimiter);
  return index < 0 ? '' : name.slice(0, index + delimiter.length);
};

// Every folder that contains `name`, outermost first. A leading delimiter is
// the root and not a folder of its own: '/a/b/c' → ['/a/', '/a/b/'].
export const foldersOf = (name: string, delimiter: string) => {
  const folders: string[] = [];
  if (!delimiter) return folders;
  let index = name.indexOf(delimiter, 1);
  while (index > 0) {
    folders.push(name.slice(0, index + delimiter.length));
    index = name.indexOf(delimiter, index + delimiter.length);
  }
  return folders;
};

// The folder's last segment without the trailing delimiter.
export const folderLabel = (folder: string, delimiter: string) =>
  leafOf(folder.slice(0, -delimiter.length), delimiter);

// The folder and its ancestors as { key, label }, outermost first.
export const folderChain = (folder: string, delimiter: string) =>
  foldersOf(folder, delimiter).map(key => ({
    key,
    label: folderLabel(key, delimiter)
  }));

// The last two segments of a folder for compact display: '…/AppServer/Dashboard'.
export const shortFolder = (folder: string, delimiter: string) => {
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
export const rootFolder = (delimiter: string) => (delimiter === '/' ? '/' : '');

// Builds the folder hierarchy of `names`. Nodes are sorted by label.
export const buildFolderTree = (names: string[], delimiter: string) => {
  const nodes = new Map<string, FolderNode>();
  const roots: FolderNode[] = [];

  names.forEach(name => {
    let parent: FolderNode | null = null;
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

  const sort = (list: FolderNode[]): FolderNode[] => {
    list.sort((a, b) => a.label.localeCompare(b.label));
    list.forEach(node => sort(node.children));
    return list;
  };

  return { roots: sort(roots), keys: [...nodes.keys()] };
};
