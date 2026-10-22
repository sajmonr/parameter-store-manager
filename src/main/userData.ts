/**
 * Picks the data source and the user-data directory.
 *
 * Electron derives `userData` from the product name, which changed from
 * `ParameterStoreManager` to `Parameter Store Manager`. Pinning the old folder
 * keeps existing settings (electron-store's config.json) working after the
 * rename instead of silently starting users over with defaults.
 *
 * With the fake source (development, unless started with --aws), everything
 * lives in the project's git-ignored .dev-data folder instead, so trying
 * things never touches the real settings or AWS. The checked-in fixtures in
 * dev/fixtures seed it the first time.
 *
 * This module must be imported before anything that reads the path, such as
 * ./settings, which creates its store at import time.
 */
import { copyFileSync, existsSync, mkdirSync } from 'fs';
import path from 'path';
import { app } from 'electron';
import { startFakeSource } from './fake/fakeAws';
import { chooseSource, fakeOptions, isFakeSource, setSource } from './source';

setSource(chooseSource(app.isPackaged, process.argv, process.env));

// The project folder while running from source.
const projectDir = app.getAppPath();
export const devDataDir = path.join(projectDir, '.dev-data');
const fixturesDir = path.join(projectDir, 'dev', 'fixtures');

if (isFakeSource()) {
  const userData = path.join(devDataDir, 'userData');
  // Grouping is set up for the fixture's paths, so every view has data.
  const settingsFile = path.join(userData, 'config.json');
  if (!existsSync(settingsFile)) {
    mkdirSync(userData, { recursive: true });
    copyFileSync(path.join(fixturesDir, 'settings.json'), settingsFile);
  }
  app.setPath('userData', userData);
  startFakeSource(
    path.join(fixturesDir, 'parameters.json'),
    path.join(devDataDir, 'parameters.json'),
    fakeOptions(process.env)
  );
} else {
  app.setPath(
    'userData',
    path.join(app.getPath('appData'), 'ParameterStoreManager')
  );
}
