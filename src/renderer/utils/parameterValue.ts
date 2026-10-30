// SSM limits standard-tier values to 4 KB.
export const MAX_VALUE_LENGTH = 4096;

export const isValueValid = (value: string) =>
  value.length > 0 && value.length <= MAX_VALUE_LENGTH;
