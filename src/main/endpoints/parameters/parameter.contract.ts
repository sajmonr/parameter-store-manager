// Parameter shapes shared by the parameter endpoints.
import type { Parameter, ParameterMetadata } from '@aws-sdk/client-ssm';

// Dates cross the IPC bridge as ISO strings.
type WithIsoDate<T> = Omit<T, 'LastModifiedDate'> & {
  LastModifiedDate?: string;
};

export type ParameterMetadataDto = WithIsoDate<ParameterMetadata>;
export type ParameterDto = WithIsoDate<Parameter>;
