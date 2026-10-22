# Parameter Store Manager

Are you tired of the AWS Console yet? Can't figure out `name` `starts-with` vs `path` `recursive` when searching for parameters?

#### Parameter Store Manager is a desktop application that helps users easily view/search/manage AWS parameter store parameters.

![alt text](resources/screenshot.png)

Built with Electron, React and electron-vite.

## Quick Start

Download the app for your platform from the [Releases page](https://github.com/sajmonr/parameter-store-manager/releases), set up AWS credentials (there are several ways to do this, e.g. the [`~/.aws/credentials` file](https://docs.aws.amazon.com/sdk-for-go/v1/developer-guide/configuring-sdk.html#specifying-credentials)) and run it.

### macOS

Download `parameter-store-manager-<version>-arm64.dmg` (Apple Silicon) and copy the app to `/Applications`. The app is ad-hoc signed (there is no Developer ID signature or notarization), so Gatekeeper blocks it the first time you open it. Clear the quarantine flag:

```bash
$ xattr -dr com.apple.quarantine "/Applications/Parameter Store Manager.app"
```

To update, download the new `.dmg`, replace the app in `/Applications` and run the `xattr` command again.

### Windows

Download and run `parameter-store-manager-Setup-<version>.exe` (x64). The installer is not code-signed, so Windows SmartScreen warns about it the first time; click **More info**, then **Run anyway**.

To update, run the new setup `.exe`; it replaces the installed version.

### Linux

Download the package for your distribution and architecture: the `.deb` for Debian and Ubuntu, the `.rpm` for Fedora, RHEL and openSUSE, or the `.AppImage` for any distribution. Each comes for x64 (`amd64`, `x86_64`) and arm64 (`arm64`, `aarch64`); `uname -m` tells you which you have.

```bash
# x64
$ sudo apt install ./parameter-store-manager_<version>_amd64.deb    # Debian, Ubuntu
$ sudo dnf install ./parameter-store-manager-<version>.x86_64.rpm  # Fedora, RHEL
$ chmod +x parameter-store-manager-<version>-x86_64.AppImage && ./parameter-store-manager-<version>-x86_64.AppImage

# arm64
$ sudo apt install ./parameter-store-manager_<version>_arm64.deb     # Debian, Ubuntu
$ sudo dnf install ./parameter-store-manager-<version>.aarch64.rpm   # Fedora, RHEL
$ chmod +x parameter-store-manager-<version>-arm64.AppImage && ./parameter-store-manager-<version>-arm64.AppImage
```

To update, install the new `.deb` or `.rpm` over the old one, or replace the `.AppImage`.

### Updates

The app can't update itself: without a Developer ID signature macOS refuses to install a downloaded update. Instead, on startup it reads the version of the [latest release](https://github.com/sajmonr/parameter-store-manager/releases/latest) and shows a notice, with the update steps for your platform, when a newer one exists. **Check for Updates…** in the application menu (the Help menu on Windows and Linux) does the same on demand. Each platform reads its own manifest from the release (`latest-mac.yml`, `latest.yml`, `latest-linux.yml` or `latest-linux-arm64.yml`). A failed check (for example, offline) is only written to the log. The startup check runs only in the packaged app; set `CHECK_UPDATES=true` to run it from `npm run dev`.

## Current Features

- View parameters: Tree view, list view
- Filter parameters: Filter by keyword (with highlighting)
- Search parameters: by path (glob (\*, \*\*) supported)
  - e.g. `/path/**/*Url`
  - e.g. `*parameter`
- Add new parameters
  - Service parameter (assuming path `/services/{environments}/{serviceName}/{parameterName}`)
  - Generic parameter
  - Supports `String`, `SecureString` (no `StringList` support atm)
    - Supports KMS Key Encryption for `SecureString`
- Edit parameter
  - Change the description, value
  - Change from/to `String` and `SecureString`
- Duplicate parameter
  - Opens the `add new parameters` flow with the values pre-filled.
- Delete parameter
- Copy parameter values with one click
- Refetch/refresh parameters

## Building from source

All platforms need Node.js 22.22.2 or newer and npm. `npm run package` builds and packages the app for the current platform into `release/`. The [Build workflow](.github/workflows/build.yml) packages all three platforms (Linux for both x64 and arm64) on every pull request and keeps the installers as workflow artifacts.

### macOS

Install the Xcode Command Line Tools (`xcode-select --install`), then:

```bash
$ npm install
$ npm run package
```

This produces a native Apple Silicon (arm64) build: `release/parameter-store-manager-<version>-arm64.dmg` and `release/mac-arm64/Parameter Store Manager.app`. To confirm the binary is native, `file "release/mac-arm64/Parameter Store Manager.app/Contents/MacOS/Parameter Store Manager"` should report `arm64`.

### Windows

```bash
$ npm install
$ npm run package
```

This produces the x64 installer `release/parameter-store-manager-Setup-<version>.exe`.

### Linux

The `.rpm` target needs `rpmbuild`; on Debian and Ubuntu install it with `sudo apt-get install rpm`. Then:

```bash
$ npm install
$ npm run package
```

This produces packages for the machine's architecture. On x64: `release/parameter-store-manager_<version>_amd64.deb`, `release/parameter-store-manager-<version>.x86_64.rpm` and `release/parameter-store-manager-<version>-x86_64.AppImage`. On arm64: `release/parameter-store-manager_<version>_arm64.deb`, `release/parameter-store-manager-<version>.aarch64.rpm` and `release/parameter-store-manager-<version>-arm64.AppImage`.

## Development

```bash
$ npm run dev        # starts the app with hot reloading, on fake data
$ npm run dev:aws    # the same, on real AWS data
$ npm run dev:reset-data  # puts the fake parameters back to the fixture
$ npm run build      # builds main, preload and renderer into out/
$ npm start          # runs the built app from out/, on fake data
$ npm run start:aws  # the same, on real AWS data
$ npm test           # unit tests (Vitest)
$ npm run lint       # ESLint
$ npm run typecheck  # TypeScript (main/preload and renderer)
$ npm run format     # Prettier (writes)
$ npm run format:check  # Prettier (CI check, no writes)
```

Set `START_MINIMIZED=true` to keep the window from taking focus when it starts.

### Fake data

Running from source reads a fake, local dataset by default, so you can create, edit and delete freely without touching AWS. Real data needs an explicit `npm run dev:aws` or `npm run start:aws` (or `PSM_SOURCE=aws`). The packaged app always reads AWS. While fake data is in use, the profile chip and the window title say **FAKE**, and the menu bar has a **Fake Data** menu.

- `dev/fixtures/parameters.json` is the checked-in dataset: about 240 parameters across several services and environments, names that fall under Other paths, SecureStrings and StringLists. `dev/fixtures/settings.json` seeds the settings, with grouping already set up for it.
- The first start copies them into the git-ignored `.dev-data/` folder: `.dev-data/parameters.json` for the parameters, `.dev-data/userData/` for the settings. Changes are written there, last across restarts, and never show up in git. Your real settings are not read or changed.
- **Fake Data → Reset Fake Data** (or `npm run dev:reset-data` while the app is closed) puts the parameters back to the fixture. Delete `.dev-data/` to reset the settings too.
- Nothing calls AWS: the app keeps its real SDK clients, and a middleware in `src/main/fake/fakeAws.ts` answers each command from the dataset. A command the fake doesn't know fails with `UnsupportedFakeCommand`; add it there when a new AWS call is added.

These environment variables tune the fake source:

| Variable             | Default | Effect                                                                                 |
| -------------------- | ------- | -------------------------------------------------------------------------------------- |
| `PSM_FAKE_DELAY_MS`  | `150`   | How long each fake AWS call takes, so loading states are visible.                      |
| `PSM_FAKE_PAGE_SIZE` | `25`    | The most parameters a page returns, so the list fills in page by page.                 |
| `PSM_FAKE_ERROR`     | –       | `expired`, `denied` or `generic`: every call fails that way, to try the error screens. |

### Project layout

The app is written in TypeScript.

- `src/main` – Electron main process. It owns the AWS SDK clients (`aws.ts`), the settings store (`settings.ts`) and the IPC endpoints (`endpoints/`).
- `src/preload` – exposes `window.api` to the renderer through `contextBridge`: a generic `invoke` for endpoints and `on` for the events main sends.
- `src/shared` – code and types used by both sides: settings, the contract helpers and the events.
- `src/renderer` – the React UI. It has no Node.js access (`nodeIntegration: false`, `contextIsolation: true`, `sandbox: true`) and talks to AWS only through `window.api`. Parameters and KMS keys are loaded with TanStack Query; settings and UI state live in small Zustand stores (`src/renderer/state`). Endpoints are called through one service per concern (`src/renderer/services`).

### IPC endpoints

Each call from the renderer to the main process is an endpoint with its own folder in `src/main/endpoints`, for example `parameters/putParameter/`:

- `putParameter.contract.ts` – the channel, the request as a Zod schema and the response type, made with `defineContract`. Both processes import it.
- `handler.ts` – `defineEndpoint(contract, handler)`. The handler gets the request already validated against the schema.

`src/main/endpoints/index.ts` registers every `handler.ts` it finds; the renderer calls an endpoint with `call(contract, request)`. To add one, create the folder with both files and call it from a service.

Contracts are bundled into the renderer, so they may import only `zod`, `src/shared` and other contracts (type-only imports are fine). ESLint enforces this, and the renderer's typecheck includes the contracts, so Node APIs in a contract fail it.

### AWS credentials

Credentials are resolved in the main process in this order:

1. `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` / `AWS_SESSION_TOKEN` environment variables
2. The profile set in Settings (or the default profile) from `~/.aws/credentials` and `~/.aws/config`, including SSO, assumed roles and `credential_process`

Changing the profile or a region in Settings takes effect on the next refresh; no restart is needed.

## Packaging

To package apps for the local platform:

```bash
$ npm run package
```

To package apps for all platforms:

First, refer to the [Multi Platform Build docs](https://www.electron.build/multi-platform-build) for dependencies.

Then,

```bash
$ npm run package-all
```

To package apps with options:

```bash
$ npm run package -- --[option]
```

:bulb: You can debug your production build with devtools by simply setting the `DEBUG_PROD` env variable when you start it:

```bash
DEBUG_PROD=true "release/mac-arm64/Parameter Store Manager.app/Contents/MacOS/Parameter Store Manager"
```

## Contributing

### Naming commits and pull requests

Pull requests are **squash-merged**, so the PR title becomes the commit on `main`. Titles must follow [Conventional Commits](https://www.conventionalcommits.org/); a `PR title` check enforces it. Commits inside a PR can be named however you like.

The format is `type(optional scope): description`, for example:

```
feat: add bulk delete
fix(settings): keep the profile when the region changes
docs: explain credential_process profiles
```

The type decides what the next release looks like:

| Type                                                        | Use it for                  | Next version          | In the changelog         |
| ----------------------------------------------------------- | --------------------------- | --------------------- | ------------------------ |
| `feat`                                                      | A new feature               | minor (0.6.0 → 0.7.0) | Features                 |
| `fix`                                                       | A bug fix                   | patch (0.6.0 → 0.6.1) | Bug Fixes                |
| `perf`                                                      | A performance improvement   | patch                 | Performance Improvements |
| `revert`                                                    | Reverting an earlier change | patch                 | Reverts                  |
| `docs`, `style`, `refactor`, `test`, `build`, `ci`, `chore` | Everything else             | no release on its own | not listed               |

Breaking changes: add `!` after the type, for example `feat!: drop Intel builds`. While the version is below 1.0.0 this bumps the minor version; from 1.0.0 on it bumps the major version. (A `BREAKING CHANGE: ...` paragraph also works, but only if it ends up in the squash-merge commit message.)

Use lowercase, write the description in the imperative ("add", not "added"), and leave out the trailing period.

### Releasing

Releases are automated with [release-please](https://github.com/googleapis/release-please); nobody creates tags or releases by hand.

1. Merging PRs into `main` makes release-please open (or update) a PR titled `chore(main): release X.Y.Z`. It bumps `version` in `package.json` and `package-lock.json` and adds the new entries to `CHANGELOG.md`, based on the PR titles merged since the last release.
2. When you want to release, merge that PR.
3. The `Release` workflow then tags `vX.Y.Z` and builds the app on macOS, Windows and Linux in parallel. Linux is built twice, on an x64 and an arm64 runner. Each build attaches its installers, blockmaps and update manifest (`latest-mac.yml`, `latest.yml`, `latest-linux.yml`, `latest-linux-arm64.yml`) to a draft GitHub Release. Once all of them have succeeded, the release is published.

To release a specific version instead of the calculated one, add a `Release-As: 1.0.0` line to the body of a commit on `main` (for example in the squash-merge commit message).

If any platform's build fails, the release stays a draft and users never see it. For a transient failure, re-run the failed job; the other platforms' files are already attached. If the build needs a code fix, delete the draft release and its tag, then merge the fix; it ships with the next release.

## TODOS

- ~~Set up CI for release. (Windows, Mac, Linux)~~
- ~~Create other releases besides Windows.~~
- Support other types of add use cases besides the assumed `services` pattern.
- Ability to view previous versions
- Backup
- Autocomplete (service names)
- ~~Configure AWS Setup (Environments, etc.)~~
- Bulk delete
- Bulk edit

and a lot more...
