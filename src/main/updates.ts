/**
 * Release notifier. The app is ad-hoc signed, so electron-updater can't
 * install updates on macOS (Squirrel.Mac requires a Developer ID signature).
 * Instead we read the version from the platform's manifest (`latest-mac.yml`,
 * `latest.yml`, `latest-linux.yml` or `latest-linux-arm64.yml`) that the
 * Release workflow attaches to every GitHub Release and tell the user when a newer one exists. Everything
 * here fails quietly: a failed check only logs.
 */
import { app, dialog, net, shell } from 'electron';
import log from 'electron-log/main';
import type { UpdateCheckResult } from './endpoints/updates/checkForUpdates/checkForUpdates.contract';

const OWNER = 'sajmonr';
const REPO = 'parameter-store-manager';

export const RELEASES_URL = `https://github.com/${OWNER}/${REPO}/releases`;
export const releaseTagUrl = (version: string) =>
  `${RELEASES_URL}/tag/v${version}`;

// electron-builder's manifest names; everything else is a Linux build, which
// gets a separate manifest per architecture.
const MANIFESTS: Partial<Record<NodeJS.Platform, string>> = {
  darwin: 'latest-mac.yml',
  win32: 'latest.yml'
};
const manifestName = (platform: NodeJS.Platform, arch: string) =>
  MANIFESTS[platform] ||
  (arch === 'arm64' ? 'latest-linux-arm64.yml' : 'latest-linux.yml');

// A release-asset download, not the REST API, so no per-IP rate limit applies.
// `releases/latest` only ever resolves to the newest full (non-draft,
// non-prerelease) release. Each platform reads its own manifest, so a platform
// whose build is missing from a release is never told about it.
export const latestManifestUrl = (platform: NodeJS.Platform, arch: string) =>
  `${RELEASES_URL}/latest/download/${manifestName(platform, arch)}`;

const INSTRUCTIONS: Partial<Record<NodeJS.Platform, string>> = {
  darwin:
    'Download the new .dmg, replace the app in /Applications and run the xattr command from the README again.',
  win32:
    'Download and run the new Setup .exe; it replaces the installed version.'
};

export const updateInstructions = (platform: NodeJS.Platform) =>
  INSTRUCTIONS[platform] ||
  'Download the new .deb, .rpm or .AppImage from the release page and install it over the current one.';

const FETCH_TIMEOUT_MS = 10_000;

// `version: 0.6.1` is the first line of the manifest electron-builder writes.
export const parseManifestVersion = (text: unknown): string | null => {
  if (typeof text !== 'string') return null;
  const match = /^version:\s*['"]?([^'"\s]+)/m.exec(text);
  return match?.[1] ?? null;
};

// "v1.2.3", "1.2.3" or "1.2.3-rc.1" -> [1, 2, 3]; anything else -> null.
export const parseVersion = (value: unknown): number[] | null => {
  if (typeof value !== 'string') return null;
  const match = /^v?(\d+)\.(\d+)\.(\d+)(?:[-+].*)?$/.exec(value.trim());
  return match ? match.slice(1, 4).map(Number) : null;
};

export const isNewer = (latest: string | null, current: string) => {
  const a = parseVersion(latest);
  const b = parseVersion(current);
  if (!a || !b) return false;
  for (let i = 0; i < 3; i += 1) {
    const x = a[i] ?? 0;
    const y = b[i] ?? 0;
    if (x !== y) return x > y;
  }
  return false;
};

const messageOf = (error: unknown) =>
  error instanceof Error && error.message ? error.message : String(error);

const errorResult = (message: string): UpdateCheckResult => {
  log.warn(`Update check failed: ${message}`);
  return { status: 'error', message };
};

type FetchResponse = Pick<Response, 'ok' | 'status' | 'text'>;

interface CheckOptions {
  currentVersion: string;
  // Electron's net.fetch; `cache` is honored by Chromium's network stack.
  fetch: (
    url: string,
    init: { cache: 'no-store'; signal: AbortSignal }
  ) => Promise<FetchResponse>;
  platform?: NodeJS.Platform;
  arch?: string;
}

// Resolves to 'available', 'up-to-date' or 'error'. Never rejects.
export const checkForUpdates = async ({
  currentVersion,
  fetch,
  platform = process.platform,
  arch = process.arch
}: CheckOptions): Promise<UpdateCheckResult> => {
  const manifestUrl = latestManifestUrl(platform, arch);
  let response: FetchResponse;
  try {
    response = await fetch(manifestUrl, {
      cache: 'no-store',
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS)
    });
  } catch (error) {
    return errorResult(messageOf(error));
  }
  if (!response.ok) {
    return errorResult(`HTTP ${response.status} from ${manifestUrl}`);
  }

  let version: string | null;
  try {
    version = parseManifestVersion(await response.text());
  } catch (error) {
    return errorResult(messageOf(error));
  }
  if (!version || !parseVersion(version)) {
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

const runCheck = (): Promise<UpdateCheckResult> =>
  checkForUpdates({
    currentVersion: app.getVersion(),
    fetch: net.fetch
  }).then(result => {
    if (result.status === 'available') lastAvailable = result;
    return result;
  });

let lastAvailable: Extract<UpdateCheckResult, { status: 'available' }> | null =
  null;
let startupCheck: Promise<UpdateCheckResult> | null = null;
let noticeHandedOut = false;

// Memoised for the life of the process, so reloading the renderer doesn't
// re-fetch.
export const checkOnStartup = (): Promise<UpdateCheckResult> => {
  if (!shouldCheckOnStartup()) {
    return Promise.resolve({ status: 'skipped' });
  }
  if (!startupCheck) startupCheck = runCheck();
  return startupCheck;
};

// What the renderer gets. An 'available' result is handed out once per
// process; a remounted renderer (reload) gets 'already-notified' instead, so
// the notice can't be shown twice.
export const checkForRenderer = async (): Promise<UpdateCheckResult> => {
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

  const reason = result.status === 'error' ? result.message : result.status;
  await dialog.showMessageBox({
    type: 'warning',
    message: "Couldn't check for updates",
    detail: `${reason}\n\nYou can always find the latest version at ${RELEASES_URL}`,
    buttons: ['OK']
  });
};
