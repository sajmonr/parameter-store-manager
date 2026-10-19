// Items chosen in the app menu, which the main process builds.
export const menuService = {
  // Returns an unsubscribe function.
  onOpenSettings: (callback: () => void) =>
    window.api.on('menu.openSettings', () => callback())
};
