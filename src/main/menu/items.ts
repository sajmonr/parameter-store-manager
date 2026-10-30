// Menu items shared by the macOS and the default menus. Labels and
// accelerators differ by platform, so they are passed in.
import type { BrowserWindow, MenuItemConstructorOptions } from 'electron';
import { resetFakeData } from '../fake/fakeAws';
import { sendEvent } from '../events';

export const APP_NAME = 'Parameter Store Manager';

type Item = MenuItemConstructorOptions;

export const reloadItem = (
  window: BrowserWindow,
  label: string,
  accelerator: string
): Item => ({
  label,
  accelerator,
  click: () => {
    window.webContents.reload();
  }
});

export const fullScreenItem = (
  window: BrowserWindow,
  label: string,
  accelerator: string
): Item => ({
  label,
  accelerator,
  click: () => {
    window.setFullScreen(!window.isFullScreen());
  }
});

export const devToolsItem = (
  window: BrowserWindow,
  label: string,
  accelerator: string
): Item => ({
  label,
  accelerator,
  click: () => {
    window.webContents.toggleDevTools();
  }
});

// The renderer opens the Settings page.
export const settingsItem = (
  window: BrowserWindow,
  label: string,
  accelerator: string
): Item => ({
  label,
  accelerator,
  click: () => {
    sendEvent(window.webContents, 'menu.openSettings');
  }
});

// Only with the fake source. A reset puts the fixture's parameters back
// and reloads them; the fake settings are kept.
export const fakeDataMenu = (window: BrowserWindow): Item => ({
  label: 'Fake Data',
  submenu: [
    {
      label: 'Reset Fake Data',
      click: () => {
        resetFakeData();
        window.webContents.reload();
      }
    }
  ]
});
