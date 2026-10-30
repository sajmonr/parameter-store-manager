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

// Enter or Space, the keys that press a button.
export const isActivateKey = (event: { key: string }) =>
  event.key === 'Enter' || event.key === ' ';

// A keydown handler that makes an element act like a button.
export const onActivateKey =
  (activate: () => void) =>
  (event: { key: string; preventDefault: () => void }) => {
    if (!isActivateKey(event)) return;
    event.preventDefault();
    activate();
  };
