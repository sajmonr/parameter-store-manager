/**
 * Keeps the user-data directory where it was before the app was renamed.
 *
 * Electron derives `userData` from the product name, which changed from
 * `ParameterStoreManager` to `Parameter Store Manager`. Pinning the old folder
 * keeps existing settings (electron-store's config.json) working after the
 * rename instead of silently starting users over with defaults.
 *
 * This module must be imported before anything that reads the path, such as
 * ./settings, which creates its store at import time.
 */
import path from 'path';
import { app } from 'electron';

app.setPath(
  'userData',
  path.join(app.getPath('appData'), 'ParameterStoreManager')
);
