/**
 * Release notifier. The app is ad-hoc signed, so electron-updater can't
 * install updates on macOS (Squirrel.Mac requires a Developer ID signature).
 * Instead we read the version from the platform's manifest (`latest-mac.yml`,
 * `latest.yml` or `latest-linux.yml`) that the Release workflow attaches to
 * every GitHub Release and tell the user when a newer one exists. Everything
 * here fails quietly: a failed check only logs.
 */
import { app, dialog, net, shell } from 'electron';
import log from 'electron-log/main';

const OWNER = 'sajmonr';
const REPO = 'parameter-store-manager';

export const RELEASES_URL = `https://github.com/${OWNER}/${REPO}/releases`;
export const releaseTagUrl = version => `${RELEASES_URL}/tag/v${version}`;

// electron-builder's manifest names; everything else is a Linux build.
const MANIFESTS = { darwin: 'latest-mac.yml', win32: 'latest.yml' };

// A release-asset download, not the REST API, so no per-IP rate limit applies.
// `releases/latest` only ever resolves to the newest full (non-draft,
// non-prerelease) release. Each platform reads its own manifest, so a platform
// whose build is missing from a release is never told about it.
export const latestManifestUrl = platform =>
  `${RELEASES_URL}/latest/download/${MANIFESTS[platform] || 'latest-linux.yml'}`;

const INSTRUCTIONS = {
  darwin:
    'Download the new .dmg, replace the app in /Applications and run the xattr command from the README again.',
  win32:
    'Download and run the new Setup .exe; it replaces the installed version.'
};

export const updateInstructions = platform =>
  INSTRUCTIONS[platform] ||
  'Download the new .deb, .rpm or .AppImage from the release page and install it over the current one.';

const FETCH_TIMEOUT_MS = 10_000;

// `version: 0.6.1` is the first line of the manifest electron-builder writes.
export const parseManifestVersion = text => {
  if (typeof text !== 'string') return null;
  const match = /^version:\s*['"]?([^'"\s]+)/m.exec(text);
  return match ? match[1] : null;
};

// "v1.2.3", "1.2.3" or "1.2.3-rc.1" -> [1, 2, 3]; anything else -> null.
export const parseVersion = value => {
  if (typeof value !== 'string') return null;
  const match = /^v?(\d+)\.(\d+)\.(\d+)(?:[-+].*)?$/.exec(value.trim());
  return match ? match.slice(1, 4).map(Number) : null;
};

export const isNewer = (latest, current) => {
  const a = parseVersion(latest);
  const b = parseVersion(current);
  if (!a || !b) return false;
  for (let i = 0; i < 3; i += 1) {
    if (a[i] !== b[i]) return a[i] > b[i];
  }
  return false;
};

const errorResult = message => {
  log.warn(`Update check failed: ${message}`);
  return { status: 'error', message };
};

// Resolves to { status: 'available', version, url, instructions },
// { status: 'up-to-date', version } or { status: 'error', message }. Never
// rejects.
export const checkForUpdates = async ({
  currentVersion,
  fetch,
  platform = process.platform
}) => {
  const manifestUrl = latestManifestUrl(platform);
  let response;
  try {
    response = await fetch(manifestUrl, {
      cache: 'no-store',
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS)
    });
  } catch (error) {
    return errorResult(error.message || String(error));
  }
  if (!response.ok) {
    return errorResult(`HTTP ${response.status} from ${manifestUrl}`);
  }

  let version;
  try {
    version = parseManifestVersion(await response.text());
  } catch (error) {
    return errorResult(error.message || String(error));
  }
  if (!parseVersion(version)) {
    return errorResult(`Manifest has no usable version (${version}).`);
  }

  if (isNewer(version, currentVersion)) {
    log.info(`Update available: ${version} (installed ${currentVersion}).`);
    return {
      status: 'available',
      version,
      url: releaseTagUrl(version),
      instructions: updateInstructions(platform)
    };
  }
  return { status: 'up-to-date', version };
};

const shouldCheckOnStartup = () =>
  app.isPackaged || process.env.CHECK_UPDATES === 'true';

const runCheck = () =>
  checkForUpdates({
    currentVersion: app.getVersion(),
    fetch: net.fetch
  }).then(result => {
    if (result.status === 'available') lastAvailable = result;
    return result;
  });

let lastAvailable = null;
let startupCheck = null;
let noticeHandedOut = false;

// Memoised for the life of the process, so reloading the renderer doesn't
// re-fetch.
export const checkOnStartup = () => {
  if (!shouldCheckOnStartup()) {
    return Promise.resolve({ status: 'skipped' });
  }
  if (!startupCheck) startupCheck = runCheck();
  return startupCheck;
};

// What the renderer gets. An 'available' result is handed out once per
// process; a remounted renderer (reload) gets 'already-notified' instead, so
// the notice can't be shown twice.
export const checkForRenderer = async () => {
  const result = await checkOnStartup();
  if (result.status !== 'available') return result;
  if (noticeHandedOut) {
    return { status: 'already-notified', version: result.version };
  }
  noticeHandedOut = true;
  return result;
};

// The renderer never supplies a URL; we open what the last check found.
export const openReleasePage = () =>
  shell.openExternal(lastAvailable ? lastAvailable.url : RELEASES_URL);

// "Check for Updates…" menu item. Uses a dialog rather than the renderer so it
// works on macOS when no window is open.
export const checkInteractively = async () => {
  const result = await runCheck();
  const installed = app.getVersion();

  if (result.status === 'available') {
    const { response } = await dialog.showMessageBox({
      type: 'info',
      message: `Version ${result.version} is available`,
      detail: `You have ${installed}. ${result.instructions}`,
      buttons: ['Open Release Page', 'Later'],
      defaultId: 0,
      cancelId: 1
    });
    if (response === 0) await shell.openExternal(result.url);
    return;
  }

  if (result.status === 'up-to-date') {
    await dialog.showMessageBox({
      type: 'info',
      message: "You're up to date",
      detail: `Parameter Store Manager ${installed} is the latest version.`,
      buttons: ['OK']
    });
    return;
  }

  await dialog.showMessageBox({
    type: 'warning',
    message: "Couldn't check for updates",
    detail: `${result.message}\n\nYou can always find the latest version at ${RELEASES_URL}`,
    buttons: ['OK']
  });
};
