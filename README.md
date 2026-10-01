# Parameter Store Manager

Are you tired of the AWS Console yet? Can't figure out `name` `starts-with` vs `path` `recursive` when searching for parameters?

#### Parameter Store Manager is a desktop application that helps users easily view/search/manage AWS parameter store parameters.

![alt text](https://raw.githubusercontent.com/smblee/parameter-store-manager/master/resources/screenshot.png)

Built with Electron, React and electron-vite.

## Quick Start

- Download the `.dmg` for macOS (Apple Silicon) from the [Releases page](https://github.com/sajmonr/parameter-store-manager/releases). The app is not notarized, so after copying it to `/Applications` run `xattr -dr com.apple.quarantine /Applications/ParameterStoreManager.app` (see [Building from source](#building-from-source)).
- Set up AWS Credentials (there are several ways to do this. E.g. `~/.aws/credentials` method) https://docs.aws.amazon.com/sdk-for-go/v1/developer-guide/configuring-sdk.html#specifying-credentials
- Run the downloaded binary!

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

Requirements: Node.js 22.12 or newer and npm. On macOS, the Xcode Command Line Tools (`xcode-select --install`).

```bash
$ npm install
$ npm run package    # builds and packages the app for the current platform
```

On macOS this produces a native Apple Silicon (arm64) build in `release/`:

- `release/ParameterStoreManager-<version>-arm64.dmg`
- `release/mac-arm64/ParameterStoreManager.app`

To confirm the binary is native: `file release/mac-arm64/ParameterStoreManager.app/Contents/MacOS/ParameterStoreManager` should report `arm64`.

The app is ad-hoc signed (there is no Developer ID signature or notarization), so macOS Gatekeeper blocks it the first time you open it. After copying it to `/Applications`, clear the quarantine flag:

```bash
$ xattr -dr com.apple.quarantine /Applications/ParameterStoreManager.app
```

Auto-update is currently disabled; install new versions by rebuilding or downloading a new release.

## Development

```bash
$ npm run dev        # starts the app with hot reloading (electron-vite)
$ npm run build      # builds main, preload and renderer into out/
$ npm start          # runs the built app from out/
$ npm test           # unit tests (Vitest)
$ npm run lint       # ESLint
$ npm run format     # Prettier
```

Set `START_MINIMIZED=true` to keep the window from taking focus when it starts.

### Project layout

- `src/main` – Electron main process. It owns the AWS SDK clients (`aws.js`), the settings store (`settings.js`) and the IPC handlers (`ipc.js`).
- `src/preload` – exposes a small `window.api` to the renderer through `contextBridge`.
- `src/renderer` – the React UI. It has no Node.js access (`nodeIntegration: false`, `contextIsolation: true`, `sandbox: true`) and talks to AWS only through `window.api`.

### AWS credentials

Credentials are resolved in the main process in this order:

1. `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` / `AWS_SESSION_TOKEN` environment variables
2. `AMAZON_ACCESS_KEY_ID` / `AMAZON_SECRET_ACCESS_KEY` / `AMAZON_SESSION_TOKEN` environment variables
3. The profile set in Settings (or the default profile) from `~/.aws/credentials` and `~/.aws/config`, including SSO, assumed roles and `credential_process`

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
DEBUG_PROD=true release/mac-arm64/ParameterStoreManager.app/Contents/MacOS/ParameterStoreManager
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
3. The `Release` workflow then tags `vX.Y.Z`, builds the macOS app, attaches the `.dmg`, `.zip`, `latest-mac.yml` and blockmaps to a draft GitHub Release, and publishes it.

To release a specific version instead of the calculated one, add a `Release-As: 1.0.0` line to the body of a commit on `main` (for example in the squash-merge commit message).

If the build fails, the release stays a draft and users never see it. For a transient failure, re-run the failed job. If the build needs a code fix, delete the draft release and its tag, then merge the fix; it ships with the next release.

## TODOS

- Add app icon
- ~~Set up CI for release. (Windows, Mac, Linux)~~
- Clean up the code base and all the unneeded boilerplate code.
- ~~Create other releases besides Windows.~~
- Add tests
- Support other types of add use cases besides the assumed `services` pattern.
- Ability to view previous versions
- Logging
- Backup
- Autocomplete (service names)
- ~~Configure AWS Setup (Environments, etc.)~~
- Bulk delete
- Bulk edit

and a lot more...
