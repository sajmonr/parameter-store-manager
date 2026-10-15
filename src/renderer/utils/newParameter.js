// SSM limits standard-tier values to 4 KB.
export const MAX_VALUE_LENGTH = 4096;

export const NAME_ERRORS = {
  // A character SSM doesn't allow in a name.
  characters: 'characters',
  // An empty folder, from a leading, trailing or doubled delimiter.
  emptySegment: 'emptySegment',
  exists: 'exists'
};

// What SSM allows between delimiters.
const SEGMENT = /^[A-Za-z0-9_.-]+$/;

export const isValueValid = value =>
  value.length > 0 && value.length <= MAX_VALUE_LENGTH;

// Checks the new-parameter form. `folder` comes from the folder picker; the
// name may add new folders below it ('Cache/Ttl'). `existingNames` is a Set
// of loaded names.
export const checkNewParameter = (
  { folder = '', name = '', value = '' },
  existingNames,
  delimiter
) => {
  const fullPath = folder + name;
  const segments = delimiter ? name.split(delimiter) : [name];

  let nameError = null;
  if (name && segments.some(segment => segment && !SEGMENT.test(segment))) {
    nameError = NAME_ERRORS.characters;
  } else if (name && segments.some(segment => !segment)) {
    nameError = NAME_ERRORS.emptySegment;
  } else if (name && existingNames.has(fullPath)) {
    nameError = NAME_ERRORS.exists;
  }

  return {
    fullPath,
    nameError,
    ready: !!name && !nameError && isValueValid(value)
  };
};
