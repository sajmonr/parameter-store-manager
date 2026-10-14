/**
 * Electron main process. AWS clients and settings live here; the renderer
 * reaches them only through the IPC handlers in ./ipc and the preload script.
 */
import './userData';
import path from 'path';
import { app, BrowserWindow, ipcMain, nativeTheme } from 'electron';
import MenuBuilder from './menu';
import { registerIpcHandlers } from './ipc';
import { availableSettings, getSetting, onSettingsChange } from './settings';

const isDebug = !app.isPackaged || process.env.DEBUG_PROD === 'true';
// Set by electron-vite while `npm run dev` is running.
const devServerUrl = process.env.ELECTRON_RENDERER_URL;

let mainWindow = null;

const installExtensions = async () => {
  const {
    default: installExtension,
    REACT_DEVELOPER_TOOLS,
    REDUX_DEVTOOLS
  } = await import('electron-devtools-installer');
  return installExtension([REACT_DEVELOPER_TOOLS, REDUX_DEVTOOLS]).catch(
    console.log
  );
};

// Matches antd's layout background, so the window doesn't flash the wrong
// color before the first paint or on reload.
const windowBackground = () =>
  nativeTheme.shouldUseDarkColors ? '#000000' : '#f5f5f5';

const createWindow = () => {
  mainWindow = new BrowserWindow({
    show: false,
    width: 1280,
    height: 800,
    // Below 1100px the detail pane becomes a drawer; below this the table
    // and folder tree get too narrow to read.
    minWidth: 900,
    minHeight: 600,
    backgroundColor: windowBackground(),
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true
    }
  });

  // The app never opens other windows.
  mainWindow.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));

  if (devServerUrl) {
    mainWindow.loadURL(devServerUrl);
  } else {
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
  }

  mainWindow.once('ready-to-show', () => {
    if (process.env.START_MINIMIZED) {
      mainWindow.minimize();
    } else {
      mainWindow.show();
      mainWindow.focus();
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  const menuBuilder = new MenuBuilder(mainWindow, isDebug);
  menuBuilder.buildMenu();
};

app.on('window-all-closed', () => {
  // Respect the OSX convention of having the application in memory even
  // after all windows have been closed
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.whenReady().then(async () => {
  if (isDebug) {
    const { default: debug } = await import('electron-debug');
    debug({ isEnabled: true, showDevTools: false });
    await installExtensions();
  }

  registerIpcHandlers(ipcMain, devServerUrl);
  // Also drives prefers-color-scheme in the renderer, which picks the antd theme.
  nativeTheme.themeSource = getSetting(availableSettings.theme);
  onSettingsChange(settings => {
    nativeTheme.themeSource = settings[availableSettings.theme];
    if (mainWindow) mainWindow.webContents.send('settings:changed', settings);
  });
  // Fires for both a theme setting change and an OS appearance change.
  nativeTheme.on('updated', () => {
    if (mainWindow) mainWindow.setBackgroundColor(windowBackground());
  });

  createWindow();
});
