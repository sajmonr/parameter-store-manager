const isMac = /Mac/.test(navigator.platform);

// ⌘↵ on macOS, Ctrl+Enter elsewhere.
export const isSubmitShortcut = event =>
  event.key === 'Enter' && (event.metaKey || event.ctrlKey);

export const submitShortcutLabel = isMac ? '⌘↵' : 'Ctrl+↵';
