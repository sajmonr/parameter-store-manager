import { Menu } from 'electron';
import type { BrowserWindow } from 'electron';
import { isFakeSource } from '../source';
import { darwinTemplate } from './darwinTemplate';
import { defaultTemplate } from './defaultTemplate';
import { fakeDataMenu } from './items';

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
        ? darwinTemplate(this.mainWindow, this.isDebug)
        : defaultTemplate(this.mainWindow, this.isDebug);

    // Before the last menu: Window on macOS, Help elsewhere.
    if (isFakeSource()) template.splice(-1, 0, fakeDataMenu(this.mainWindow));

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
}
