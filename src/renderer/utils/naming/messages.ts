// What the form says about a name it can't create.
import { NAME_ERRORS } from './validate';
import type { NameError } from './validate';

export const nameErrorText = (error: NameError, delimiter: string) =>
  ({
    [NAME_ERRORS.spaces]: "Names can't contain spaces.",
    [NAME_ERRORS.characters]: `Use letters, digits, _ . - and ${delimiter} only.`,
    [NAME_ERRORS.leadingDelimiter]: `The key starts after the service. Remove the leading ${delimiter}.`,
    [NAME_ERRORS.notRooted]: `Paths start with ${delimiter}.`,
    [NAME_ERRORS.emptySegment]: `Folder names can't be empty. Remove the extra ${delimiter}.`,
    [NAME_ERRORS.noName]: `Add a name after the last ${delimiter}.`
  })[error];

export const listEnvs = (envs: string[]) =>
  `${envs.join(', ')}. Deselect ${envs.length > 1 ? 'them' : 'it'}`;
