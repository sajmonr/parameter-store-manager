import { app } from 'electron';
import type { BrowserWindow, MenuItemConstructorOptions } from 'electron';
import { checkInteractively } from '../updates';
import {
  APP_NAME,
  devToolsItem,
  fullScreenItem,
  reloadItem,
  settingsItem
} from './items';

// The macOS menu bar: the app menu, Edit, View and Window.
export const darwinTemplate = (
  window: BrowserWindow,
  isDebug: boolean
): MenuItemConstructorOptions[] => {
  const subMenuAbout: MenuItemConstructorOptions = {
    label: APP_NAME,
    submenu: [
      { label: `About ${APP_NAME}`, role: 'about' },
      { type: 'separator' },
      {
        label: 'Check for Updates…',
        click: () => {
          checkInteractively();
        }
      },
      { type: 'separator' },
      settingsItem(window, 'Settings…', 'Command+,'),
      { type: 'separator' },
      { label: 'Services', submenu: [] },
      { type: 'separator' },
      { label: `Hide ${APP_NAME}`, accelerator: 'Command+H', role: 'hide' },
      {
        label: 'Hide Others',
        accelerator: 'Command+Shift+H',
        role: 'hideOthers'
      },
      { label: 'Show All', role: 'unhide' },
      { type: 'separator' },
      {
        label: 'Quit',
        accelerator: 'Command+Q',
        click: () => {
          app.quit();
        }
      }
    ]
  };
  const subMenuEdit: MenuItemConstructorOptions = {
    label: 'Edit',
    submenu: [
      { label: 'Undo', accelerator: 'Command+Z', role: 'undo' },
      { label: 'Redo', accelerator: 'Shift+Command+Z', role: 'redo' },
      { type: 'separator' },
      { label: 'Cut', accelerator: 'Command+X', role: 'cut' },
      { label: 'Copy', accelerator: 'Command+C', role: 'copy' },
      { label: 'Paste', accelerator: 'Command+V', role: 'paste' },
      { label: 'Select All', accelerator: 'Command+A', role: 'selectAll' }
    ]
  };
  const fullScreen = fullScreenItem(
    window,
    'Toggle Full Screen',
    'Ctrl+Command+F'
  );
  const subMenuView: MenuItemConstructorOptions = {
    label: 'View',
    submenu: isDebug
      ? [
          reloadItem(window, 'Reload', 'Command+R'),
          fullScreen,
          devToolsItem(window, 'Toggle Developer Tools', 'Alt+Command+I')
        ]
      : [fullScreen]
  };
  const subMenuWindow: MenuItemConstructorOptions = {
    label: 'Window',
    submenu: [
      { label: 'Minimize', accelerator: 'Command+M', role: 'minimize' },
      { label: 'Close', accelerator: 'Command+W', role: 'close' },
      { type: 'separator' },
      { label: 'Bring All to Front', role: 'front' }
    ]
  };

  return [subMenuAbout, subMenuEdit, subMenuView, subMenuWindow];
};
