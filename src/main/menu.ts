import { app, Menu } from 'electron';
import type { BrowserWindow, MenuItemConstructorOptions } from 'electron';
import { resetFakeData } from './fake/fakeAws';
import { isFakeSource } from './source';
import { checkInteractively } from './updates';

export default class MenuBuilder {
  constructor(
    private readonly mainWindow: BrowserWindow,
    private readonly isDebug: boolean
  ) {}

  buildMenu() {
    if (this.isDebug) {
      this.setupDevelopmentEnvironment();
    }

    const template =
      process.platform === 'darwin'
        ? this.buildDarwinTemplate()
        : this.buildDefaultTemplate();

    // Before the last menu: Window on macOS, Help elsewhere.
    if (isFakeSource()) template.splice(-1, 0, this.buildFakeDataMenu());

    const menu = Menu.buildFromTemplate(template);
    Menu.setApplicationMenu(menu);

    return menu;
  }

  // DevTools stay closed until toggled from the View menu, matching the
  // `showDevTools: false` passed to electron-debug in index.js.
  setupDevelopmentEnvironment() {
    this.mainWindow.webContents.on('context-menu', (_event, props) => {
      const { x, y } = props;

      Menu.buildFromTemplate([
        {
          label: 'Inspect element',
          click: () => {
            this.mainWindow.webContents.inspectElement(x, y);
          }
        }
      ]).popup({ window: this.mainWindow });
    });
  }

  // The renderer opens the Settings page.
  openSettings() {
    this.mainWindow.webContents.send('menu.openSettings');
  }

  // Only with the fake source. A reset puts the fixture's parameters back
  // and reloads them; the fake settings are kept.
  buildFakeDataMenu(): MenuItemConstructorOptions {
    return {
      label: 'Fake Data',
      submenu: [
        {
          label: 'Reset Fake Data',
          click: () => {
            resetFakeData();
            this.mainWindow.webContents.reload();
          }
        }
      ]
    };
  }

  buildDarwinTemplate(): MenuItemConstructorOptions[] {
    const subMenuAbout: MenuItemConstructorOptions = {
      label: 'Parameter Store Manager',
      submenu: [
        {
          label: 'About Parameter Store Manager',
          role: 'about'
        },
        { type: 'separator' },
        {
          label: 'Check for Updates…',
          click: () => {
            checkInteractively();
          }
        },
        { type: 'separator' },
        {
          label: 'Settings…',
          accelerator: 'Command+,',
          click: () => {
            this.openSettings();
          }
        },
        { type: 'separator' },
        { label: 'Services', submenu: [] },
        { type: 'separator' },
        {
          label: 'Hide Parameter Store Manager',
          accelerator: 'Command+H',
          role: 'hide'
        },
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
        {
          label: 'Select All',
          accelerator: 'Command+A',
          role: 'selectAll'
        }
      ]
    };
    const subMenuViewDev: MenuItemConstructorOptions = {
      label: 'View',
      submenu: [
        {
          label: 'Reload',
          accelerator: 'Command+R',
          click: () => {
            this.mainWindow.webContents.reload();
          }
        },
        {
          label: 'Toggle Full Screen',
          accelerator: 'Ctrl+Command+F',
          click: () => {
            this.mainWindow.setFullScreen(!this.mainWindow.isFullScreen());
          }
        },
        {
          label: 'Toggle Developer Tools',
          accelerator: 'Alt+Command+I',
          click: () => {
            this.mainWindow.webContents.toggleDevTools();
          }
        }
      ]
    };
    const subMenuViewProd: MenuItemConstructorOptions = {
      label: 'View',
      submenu: [
        {
          label: 'Toggle Full Screen',
          accelerator: 'Ctrl+Command+F',
          click: () => {
            this.mainWindow.setFullScreen(!this.mainWindow.isFullScreen());
          }
        }
      ]
    };
    const subMenuWindow: MenuItemConstructorOptions = {
      label: 'Window',
      submenu: [
        {
          label: 'Minimize',
          accelerator: 'Command+M',
          role: 'minimize'
        },
        { label: 'Close', accelerator: 'Command+W', role: 'close' },
        { type: 'separator' },
        { label: 'Bring All to Front', role: 'front' }
      ]
    };

    const subMenuView = this.isDebug ? subMenuViewDev : subMenuViewProd;

    return [subMenuAbout, subMenuEdit, subMenuView, subMenuWindow];
  }

  buildDefaultTemplate(): MenuItemConstructorOptions[] {
    const templateDefault: MenuItemConstructorOptions[] = [
      {
        label: '&File',
        submenu: [
          {
            label: '&Settings…',
            accelerator: 'Ctrl+,',
            click: () => {
              this.openSettings();
            }
          },
          { type: 'separator' },
          {
            label: '&Close',
            accelerator: 'Ctrl+W',
            click: () => {
              this.mainWindow.close();
            }
          }
        ]
      },
      {
        label: '&View',
        submenu: this.isDebug
          ? [
              {
                label: '&Reload',
                accelerator: 'Ctrl+R',
                click: () => {
                  this.mainWindow.webContents.reload();
                }
              },
              {
                label: 'Toggle &Full Screen',
                accelerator: 'F11',
                click: () => {
                  this.mainWindow.setFullScreen(
                    !this.mainWindow.isFullScreen()
                  );
                }
              },
              {
                label: 'Toggle &Developer Tools',
                accelerator: 'Alt+Ctrl+I',
                click: () => {
                  this.mainWindow.webContents.toggleDevTools();
                }
              }
            ]
          : [
              {
                label: 'Toggle &Full Screen',
                accelerator: 'F11',
                click: () => {
                  this.mainWindow.setFullScreen(
                    !this.mainWindow.isFullScreen()
                  );
                }
              }
            ]
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

    return templateDefault;
  }
}
