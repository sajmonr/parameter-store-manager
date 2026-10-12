import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('electron-log/main', () => ({
  default: { info: vi.fn(), warn: vi.fn(), error: vi.fn() }
}));
vi.mock('electron', () => ({
  app: { isPackaged: false, getVersion: vi.fn(() => '0.6.1') },
  net: { fetch: vi.fn() },
  dialog: { showMessageBox: vi.fn(async () => ({ response: 0 })) },
  shell: { openExternal: vi.fn(async () => {}) }
}));

const log = (await import('electron-log/main')).default;
const electron = await import('electron');
const {
  RELEASES_URL,
  checkForRenderer,
  checkForUpdates,
  checkInteractively,
  checkOnStartup,
  isNewer,
  latestManifestUrl,
  openReleasePage,
  parseManifestVersion,
  parseVersion,
  releaseTagUrl,
  updateInstructions
} = await import('./updates');

const MANIFEST = `version: 0.6.1
files:
  - url: ParameterStoreManager-0.6.1-arm64-mac.zip
    sha512: cCrsd1a9kzl2IxyGIpZC33xNMe0YHdm0X44GyCMVscwFeSMKJL0D3DWJFkWnZynkI7ZGgVeYuV0GMSrMEda3xQ==
    size: 128318365
path: ParameterStoreManager-0.6.1-arm64-mac.zip
releaseDate: '2026-10-02T14:49:48.690Z'
`;

const okResponse = body => ({ ok: true, status: 200, text: async () => body });
const fetchReturning = body => vi.fn(async () => okResponse(body));

beforeEach(() => {
  vi.clearAllMocks();
  delete process.env.CHECK_UPDATES;
});

describe('parseVersion', () => {
  it.each([
    ['v0.6.1', [0, 6, 1]],
    ['0.6.1', [0, 6, 1]],
    [' 1.2.3 ', [1, 2, 3]],
    ['v1.0.0-rc.1', [1, 0, 0]],
    ['1.0.0+build.5', [1, 0, 0]]
  ])('parses %s', (input, expected) => {
    expect(parseVersion(input)).toEqual(expected);
  });

  it.each(['', 'latest', '1.2', '1.2.3.4', 'v1.2.x', null, undefined, 42])(
    'rejects %s',
    input => {
      expect(parseVersion(input)).toBeNull();
    }
  );
});

describe('isNewer', () => {
  it.each([
    ['0.6.2', '0.6.1'],
    ['0.7.0', '0.6.1'],
    ['1.0.0', '0.6.1'],
    ['0.10.0', '0.9.0'],
    ['v0.6.2', '0.6.1']
  ])('%s is newer than %s', (latest, current) => {
    expect(isNewer(latest, current)).toBe(true);
  });

  it.each([
    ['0.6.1', '0.6.1'],
    ['0.6.0', '0.6.1'],
    ['0.9.0', '0.10.0'],
    ['garbage', '0.6.1'],
    ['0.6.2', 'DEVELOPMENT']
  ])('%s is not newer than %s', (latest, current) => {
    expect(isNewer(latest, current)).toBe(false);
  });
});

describe('parseManifestVersion', () => {
  it('reads the version line of latest-mac.yml', () => {
    expect(parseManifestVersion(MANIFEST)).toBe('0.6.1');
  });

  it('accepts a quoted value and a version line that is not first', () => {
    expect(parseManifestVersion("path: a.zip\nversion: '1.2.3'\n")).toBe(
      '1.2.3'
    );
    expect(parseManifestVersion('version: "1.2.3"')).toBe('1.2.3');
  });

  it('returns null when there is no version line', () => {
    expect(parseManifestVersion('files: []\n')).toBeNull();
    expect(parseManifestVersion('')).toBeNull();
    expect(parseManifestVersion(undefined)).toBeNull();
  });
});

describe('latestManifestUrl', () => {
  it.each([
    ['darwin', 'latest-mac.yml'],
    ['win32', 'latest.yml'],
    ['linux', 'latest-linux.yml'],
    ['freebsd', 'latest-linux.yml']
  ])('points %s at %s in the latest release', (platform, file) => {
    expect(latestManifestUrl(platform)).toBe(
      `${RELEASES_URL}/latest/download/${file}`
    );
  });
});

describe('updateInstructions', () => {
  it.each([
    ['darwin', '/Applications'],
    ['win32', 'Setup .exe'],
    ['linux', '.AppImage']
  ])('tells %s users what to download', (platform, hint) => {
    expect(updateInstructions(platform)).toContain(hint);
  });
});

describe('checkForUpdates', () => {
  it.each(['darwin', 'win32', 'linux'])(
    'reports a newer release with its tag page on %s',
    async platform => {
      const fetch = fetchReturning(MANIFEST);
      await expect(
        checkForUpdates({ currentVersion: '0.6.0', fetch, platform })
      ).resolves.toEqual({
        status: 'available',
        version: '0.6.1',
        url: releaseTagUrl('0.6.1'),
        instructions: updateInstructions(platform)
      });
      expect(fetch).toHaveBeenCalledWith(
        latestManifestUrl(platform),
        expect.objectContaining({ cache: 'no-store' })
      );
      expect(log.warn).not.toHaveBeenCalled();
    }
  );

  it('is up to date when the versions match', async () => {
    await expect(
      checkForUpdates({
        currentVersion: '0.6.1',
        fetch: fetchReturning(MANIFEST)
      })
    ).resolves.toEqual({ status: 'up-to-date', version: '0.6.1' });
  });

  it('is up to date when the installed build is newer than the release', async () => {
    await expect(
      checkForUpdates({
        currentVersion: '0.7.0',
        fetch: fetchReturning(MANIFEST)
      })
    ).resolves.toEqual({ status: 'up-to-date', version: '0.6.1' });
  });

  it.each([
    [
      'HTTP error',
      vi.fn(async () => ({ ok: false, status: 404, text: async () => '' }))
    ],
    ['body without a version', fetchReturning('files: []\n')],
    ['unparseable version', fetchReturning('version: latest\n')],
    [
      'network failure',
      vi.fn(async () => Promise.reject(new Error('ENOTFOUND')))
    ],
    [
      'timeout',
      vi.fn(async () => {
        const error = new Error('The operation was aborted due to timeout');
        error.name = 'TimeoutError';
        throw error;
      })
    ],
    [
      'unreadable body',
      vi.fn(async () => ({
        ok: true,
        status: 200,
        text: async () => Promise.reject(new Error('stream closed'))
      }))
    ]
  ])('resolves to an error result on %s', async (_label, fetch) => {
    const result = await checkForUpdates({ currentVersion: '0.6.1', fetch });
    expect(result.status).toBe('error');
    expect(typeof result.message).toBe('string');
    expect(log.warn).toHaveBeenCalledTimes(1);
  });
});

describe('checkOnStartup', () => {
  it('is skipped in an unpackaged app unless CHECK_UPDATES is set', async () => {
    await expect(checkOnStartup()).resolves.toEqual({ status: 'skipped' });
    expect(electron.net.fetch).not.toHaveBeenCalled();
  });

  it('fetches once and remembers the result for openReleasePage', async () => {
    process.env.CHECK_UPDATES = 'true';
    electron.net.fetch.mockResolvedValue(okResponse('version: 9.9.9\n'));

    const first = await checkOnStartup();
    const second = await checkOnStartup();

    expect(first).toEqual({
      status: 'available',
      version: '9.9.9',
      url: releaseTagUrl('9.9.9'),
      instructions: updateInstructions(process.platform)
    });
    expect(second).toBe(first);
    expect(electron.net.fetch).toHaveBeenCalledTimes(1);

    await openReleasePage();
    expect(electron.shell.openExternal).toHaveBeenCalledWith(
      releaseTagUrl('9.9.9')
    );
  });
});

describe('checkForRenderer', () => {
  it('hands out an available result only once per process', async () => {
    process.env.CHECK_UPDATES = 'true';
    electron.net.fetch.mockResolvedValue(okResponse('version: 9.9.9\n'));

    // The startup check is memoised for the process, so this sees the 9.9.9
    // result fetched in the test above without another request. The first
    // call is the initial mount; the second is a remount after a reload.
    const first = await checkForRenderer();
    const second = await checkForRenderer();

    expect(first).toEqual({
      status: 'available',
      version: '9.9.9',
      url: releaseTagUrl('9.9.9'),
      instructions: updateInstructions(process.platform)
    });
    expect(second).toEqual({ status: 'already-notified', version: '9.9.9' });
    expect(electron.net.fetch).not.toHaveBeenCalled();
  });
});

describe('checkInteractively', () => {
  it('offers to open the release page when an update exists', async () => {
    electron.net.fetch.mockResolvedValue(okResponse('version: 9.9.10\n'));
    electron.dialog.showMessageBox.mockResolvedValue({ response: 0 });

    await checkInteractively();

    expect(electron.dialog.showMessageBox).toHaveBeenCalledWith(
      expect.objectContaining({ buttons: ['Open Release Page', 'Later'] })
    );
    expect(electron.shell.openExternal).toHaveBeenCalledWith(
      releaseTagUrl('9.9.10')
    );
  });

  it('does not open anything when the user picks Later', async () => {
    electron.net.fetch.mockResolvedValue(okResponse('version: 9.9.11\n'));
    electron.dialog.showMessageBox.mockResolvedValue({ response: 1 });

    await checkInteractively();

    expect(electron.shell.openExternal).not.toHaveBeenCalled();
  });

  it('says so when already up to date', async () => {
    electron.net.fetch.mockResolvedValue(okResponse('version: 0.6.1\n'));

    await checkInteractively();

    expect(electron.dialog.showMessageBox).toHaveBeenCalledWith(
      expect.objectContaining({ message: "You're up to date" })
    );
    expect(electron.shell.openExternal).not.toHaveBeenCalled();
  });

  it('explains a failed check and points at the releases page', async () => {
    electron.net.fetch.mockRejectedValue(new Error('offline'));

    await checkInteractively();

    expect(electron.dialog.showMessageBox).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'warning',
        detail: expect.stringContaining(RELEASES_URL)
      })
    );
  });
});
