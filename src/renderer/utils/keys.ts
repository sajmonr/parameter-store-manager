const isMac = /Mac/.test(navigator.platform);

// ⌘↵ on macOS, Ctrl+Enter elsewhere.
export const isSubmitShortcut = (event: {
  key: string;
  metaKey: boolean;
  ctrlKey: boolean;
}) => event.key === 'Enter' && (event.metaKey || event.ctrlKey);

export const submitShortcutLabel = isMac ? '⌘↵' : 'Ctrl+↵';

// ⌘, on macOS, Ctrl+, elsewhere: the usual shortcut for settings.
export const isSettingsShortcut = (event: {
  key: string;
  metaKey: boolean;
  ctrlKey: boolean;
}) => event.key === ',' && (event.metaKey || event.ctrlKey);

export const settingsShortcutLabel = isMac ? '⌘,' : 'Ctrl+,';
