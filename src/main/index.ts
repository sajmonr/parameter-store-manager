/**
 * Electron main process. AWS clients and settings live here; the renderer
 * reaches them only through the IPC handlers in ./ipc and the preload script.
 */
import './userData';
import path from 'path';
import { app, BrowserWindow, ipcMain, nativeTheme, session } from 'electron';
import type { LoadExtensionOptions, Session } from 'electron';
import MenuBuilder from './menu';
import { registerEndpoints } from './endpoints';
import { availableSettings, getSetting, onSettingsChange } from './settings';
import { isFakeSource } from './source';
import { sendEvent } from './events';
import {
  WINDOW_HEIGHT,
  WINDOW_MIN_HEIGHT,
  WINDOW_MIN_WIDTH,
  WINDOW_WIDTH
} from '../shared/layout';
import { WINDOW_BACKGROUND } from '../shared/windowBackground';

const isDebug = !app.isPackaged || process.env.DEBUG_PROD === 'true';
// Set by electron-vite while `npm run dev` is running.
const devServerUrl = process.env.ELECTRON_RENDERER_URL;

let mainWindow: BrowserWindow | null = null;

// electron-devtools-installer 4.0.0 (the latest) still calls the Session
// extension methods Electron deprecated for session.extensions. Without
// forceDownload these two are all it uses.
const extensionsSession = () => {
  const { extensions } = session.defaultSession;
  return {
    getAllExtensions: () => extensions.getAllExtensions(),
    loadExtension: (path: string, options?: LoadExtensionOptions) =>
      extensions.loadExtension(path, options)
  } as unknown as Session;
};

const installExtensions = async () => {
  const { default: installExtension, REACT_DEVELOPER_TOOLS } =
    await import('electron-devtools-installer');
  return installExtension(REACT_DEVELOPER_TOOLS, {
    session: extensionsSession()
  }).catch(console.log);
};

const windowBackground = () =>
  WINDOW_BACKGROUND[nativeTheme.shouldUseDarkColors ? 'dark' : 'light'];

const createWindow = () => {
  const win = new BrowserWindow({
    show: false,
    title: isFakeSource()
      ? 'Parameter Store Manager — FAKE'
      : 'Parameter Store Manager',
    width: WINDOW_WIDTH,
    height: WINDOW_HEIGHT,
    minWidth: WINDOW_MIN_WIDTH,
    minHeight: WINDOW_MIN_HEIGHT,
    backgroundColor: windowBackground(),
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true
    }
  });

  mainWindow = win;

  // The page's <title> would replace the FAKE marker.
  if (isFakeSource()) {
    win.on('page-title-updated', event => event.preventDefault());
  }

  // The app never opens other windows.
  win.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));

  if (devServerUrl) {
    win.loadURL(devServerUrl);
  } else {
    win.loadFile(path.join(__dirname, '../renderer/index.html'));
  }

  win.once('ready-to-show', () => {
    if (process.env.START_MINIMIZED) {
      win.minimize();
    } else {
      win.show();
      win.focus();
    }
  });

  win.on('closed', () => {
    mainWindow = null;
  });

  const menuBuilder = new MenuBuilder(win, isDebug);
  menuBuilder.buildMenu();
};

// A single-window app, so it quits with its window on macOS too, like
// System Settings. Nothing would reopen the window, and the menu would
// still point at the closed one.
app.on('window-all-closed', () => {
  app.quit();
});

app.whenReady().then(async () => {
  if (isDebug) {
    const { default: debug } = await import('electron-debug');
    debug({ isEnabled: true, showDevTools: false });
    await installExtensions();
  }

  registerEndpoints(ipcMain, devServerUrl);
  // Also drives prefers-color-scheme in the renderer, which picks the antd theme.
  nativeTheme.themeSource = getSetting(availableSettings.theme);
  onSettingsChange(settings => {
    nativeTheme.themeSource = settings[availableSettings.theme];
    if (mainWindow)
      sendEvent(mainWindow.webContents, 'settings.changed', settings);
  });
  // Fires for both a theme setting change and an OS appearance change.
  nativeTheme.on('updated', () => {
    if (mainWindow) mainWindow.setBackgroundColor(windowBackground());
  });

  createWindow();
});
