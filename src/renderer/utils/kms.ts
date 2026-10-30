import {
  AWS_MANAGED_KEY_PREFIX,
  DEFAULT_KMS_KEY
} from '../../shared/parameterTypes';
import { fileKeyId } from './importFile';

export const isAwsManaged = (alias: string) =>
  alias.startsWith(AWS_MANAGED_KEY_PREFIX);

// A KMS key as SSM shows it: null is the default key.
export const kmsKeyName = (keyId: string | null | undefined) =>
  fileKeyId(keyId) ?? DEFAULT_KMS_KEY;
