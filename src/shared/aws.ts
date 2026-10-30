// AWS names shared by the main process and the renderer.

// The profile the SDK uses when none is chosen, and its name in ~/.aws.
export const DEFAULT_PROFILE_NAME = 'default';

// How a profile setting is shown: the empty setting means the default.
export const profileLabel = (profile: string | null | undefined) =>
  profile || DEFAULT_PROFILE_NAME;

// SSM's own path separator, used by hierarchies and ARNs whatever the app's
// path delimiter setting is.
export const SSM_PATH_SEPARATOR = '/';
