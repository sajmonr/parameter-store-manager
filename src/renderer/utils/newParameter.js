// SSM limits standard-tier values to 4 KB.
export const MAX_VALUE_LENGTH = 4096;

export const NAME_ERRORS = {
  invalid: 'invalid',
  exists: 'exists'
};

export const isValueValid = value =>
  value.length > 0 && value.length <= MAX_VALUE_LENGTH;

// Checks the new-parameter form. The name is a single segment; the folder
// comes from the folder picker. `existingNames` is a Set of loaded names.
export const checkNewParameter = (
  { folder = '', name = '', value = '' },
  existingNames,
  delimiter
) => {
  const fullPath = folder + name;
  let nameError = null;
  if (/[\s\\/]/.test(name) || (delimiter && name.includes(delimiter))) {
    nameError = NAME_ERRORS.invalid;
  } else if (name && existingNames.has(fullPath)) {
    nameError = NAME_ERRORS.exists;
  }

  return {
    fullPath,
    nameError,
    ready: !!name && !nameError && isValueValid(value)
  };
};
