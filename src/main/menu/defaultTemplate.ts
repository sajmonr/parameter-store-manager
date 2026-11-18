import { app } from 'electron';
import type { BrowserWindow, MenuItemConstructorOptions } from 'electron';
import { checkInteractively } from '../updates';
import {
  devToolsItem,
  fullScreenItem,
  reloadItem,
  settingsItem
} from './items';

// The menu bar on Windows and Linux: File, View and Help.
export const defaultTemplate = (
  window: BrowserWindow,
  isDebug: boolean
): MenuItemConstructorOptions[] => {
  const fullScreen = fullScreenItem(window, 'Toggle &Full Screen', 'F11');
  return [
    {
      label: '&File',
      submenu: [
        settingsItem(window, '&Settings…', 'Ctrl+,'),
        { type: 'separator' },
        {
          label: '&Close',
          accelerator: 'Ctrl+W',
          click: () => {
            window.close();
          }
        }
      ]
    },
    {
      label: '&View',
      submenu: isDebug
        ? [
            reloadItem(window, '&Reload', 'Ctrl+R'),
            fullScreen,
            devToolsItem(window, 'Toggle &Developer Tools', 'Alt+Ctrl+I')
          ]
        : [fullScreen]
    },
    {
      label: '&Help',
      submenu: [
        {
          label: 'Check for &Updates…',
          click: () => {
            checkInteractively();
          }
        },
        { type: 'separator' },
        {
          label: `Current &Version: ${
            app.isPackaged ? app.getVersion() : 'DEVELOPMENT'
          }`,
          enabled: false
        }
      ]
    }
  ];
};
