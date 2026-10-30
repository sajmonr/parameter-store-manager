// SSM parameter types and KMS defaults, shared by the main process and the
// renderer.

export const PARAMETER_TYPE = {
  String: 'String',
  SecureString: 'SecureString',
  StringList: 'StringList'
} as const;

// Every type SSM has; StringList parameters are shown and imported as
// unsupported, but not edited.
export const ALL_PARAMETER_TYPES = [
  PARAMETER_TYPE.String,
  PARAMETER_TYPE.SecureString,
  PARAMETER_TYPE.StringList
] as const;
export type AnyParameterType = (typeof ALL_PARAMETER_TYPES)[number];

// The types the app can save.
export const PARAMETER_TYPES = [
  PARAMETER_TYPE.String,
  PARAMETER_TYPE.SecureString
] as const;
export type EditableParameterType = (typeof PARAMETER_TYPES)[number];

// The type a new parameter gets when none is chosen.
export const DEFAULT_PARAMETER_TYPE: EditableParameterType =
  PARAMETER_TYPE.String;

export const isEditableType = (type: unknown): type is EditableParameterType =>
  (PARAMETER_TYPES as readonly unknown[]).includes(type);

export const isSecureType = (type: string | null | undefined) =>
  type === PARAMETER_TYPE.SecureString;

export const isSecure = (parameter: { Type?: string } | null | undefined) =>
  isSecureType(parameter?.Type);

// Lists types for messages: "String, SecureString or StringList".
export const listTypes = (types: readonly string[]) =>
  types.length < 2
    ? types.join('')
    : `${types.slice(0, -1).join(', ')} or ${types[types.length - 1]}`;

// The key SSM encrypts a SecureString with when none is given.
export const DEFAULT_KMS_KEY = 'alias/aws/ssm';
// Aliases under this prefix are keys AWS manages for its services.
export const AWS_MANAGED_KEY_PREFIX = 'alias/aws/';
