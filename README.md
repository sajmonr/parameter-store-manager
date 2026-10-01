# Parameter Store Manager

Are you tired of the AWS Console yet? Can't figure out `name` `starts-with` vs `path` `recursive` when searching for parameters?

#### Parameter Store Manager is a desktop application that helps users easily view/search/manage AWS parameter store parameters.

![alt text](https://raw.githubusercontent.com/smblee/parameter-store-manager/master/resources/screenshot.png)

Built with Electron, React and electron-vite.

## Quick Start
- Download the binary here (Supports Windows, MacOS, Linux): https://github.com/smblee/parameter-store-manager/releases
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
