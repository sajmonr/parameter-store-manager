/**
 * Electron main process. AWS clients and settings live here; the renderer
 * reaches them only through the IPC handlers in ./ipc and the preload script.
 */
import path from 'path';
import { app, BrowserWindow, ipcMain } from 'electron';
import MenuBuilder from './menu';
import { registerIpcHandlers } from './ipc';
import { onSettingsChange } from './settings';

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
  const forceDownload = !!process.env.UPGRADE_EXTENSIONS;

  return installExtension([REACT_DEVELOPER_TOOLS, REDUX_DEVTOOLS], {
    forceDownload
  }).catch(console.log);
};

const createWindow = () => {
  mainWindow = new BrowserWindow({
    show: false,
    width: 1024,
    height: 728,
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
  onSettingsChange(settings => {
    if (mainWindow) mainWindow.webContents.send('settings:changed', settings);
  });

  createWindow();
});
