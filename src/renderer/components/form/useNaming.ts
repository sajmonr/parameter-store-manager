import { useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { useLocationContext } from '../../state/settings';
import type { NewParameterPrefill } from '../../state/ui';
import { useFolderSet, useLocation, useNameSet } from '../../state/views';
import {
  initialNaming,
  listEnvs,
  missingFolders,
  NAME_ERRORS,
  nameErrorOf,
  nameErrorText,
  suggestionsFor,
  targetsOf
} from '../../utils/naming';
import type { Naming } from '../../utils/naming';
import { OTHER_PATHS_LABEL } from '../../utils/labels';
import { environmentColor, parse } from '../../utils/structure';
import type { PreviewRow } from './CreatePreview';

// The name part of the new-parameter form: the naming the user is typing,
// what's wrong with it, and the names it creates. `created` are names a
// partly failed create already made; `onChange` runs on every change.
const useNaming = (
  prefill: NewParameterPrefill | null,
  created: ReadonlySet<string>,
  failed: ReadonlyMap<string, string> | undefined,
  onChange: () => void
) => {
  const context = useLocationContext();
  const { structure, delimiter } = context;
  const location = useLocation();
  const existingNames = useNameSet();
  const folders = useFolderSet();

  const [naming, setNamingState] = useState<Naming>(() =>
    initialNaming(
      location,
      context,
      prefill?.source ?? null,
      prefill?.target ?? null
    )
  );
  // Whether the user has left the key or path field since it was shown.
  const [left, setLeft] = useState(false);

  const setNaming = (next: Naming) => {
    setNamingState(next);
    onChange();
  };

  const structured = naming.mode === 'structured';
  const text = structured ? naming.key : naming.path;
  const setText = (next: string) =>
    setNaming(
      structured ? { ...naming, key: next } : { ...naming, path: next }
    );

  const nameError = nameErrorOf(text, naming.mode, delimiter);
  // A trailing delimiter is where the user is mid-way through folders, or
  // where the form starts.
  const shownError =
    nameError === NAME_ERRORS.noName && !left ? null : nameError;
  const named = !!text && !nameError;

  const targets = named ? targetsOf(naming, context) : [];
  const existing = targets.filter(
    name => existingNames.has(name) && !created.has(name)
  );
  const pending = targets.filter(name => !created.has(name));

  const suggestions = useMemo(
    () => suggestionsFor(text, naming, folders, context),
    [text, naming, folders, context]
  );
  const newFolders = nameError
    ? ''
    : missingFolders(text, naming, folders, context);

  let fieldHelp: ReactNode = shownError && nameErrorText(shownError, delimiter);
  if (!fieldHelp && existing.length) {
    fieldHelp =
      targets.length === 1
        ? 'This name already exists. Open it to edit instead.'
        : `Already exists in ${listEnvs(
            existing.map(name => parse(name, structure, delimiter)!.env)
          )} or change the key.`;
  }

  const rows: PreviewRow[] = targets.map(name => {
    const match = parse(name, structure, delimiter);
    const color = match ? environmentColor(structure, match.env) : null;
    let meta: string | null = null;
    if (!structured && structure.enabled) {
      meta = match ? `${match.service} · ${match.env}` : OTHER_PATHS_LABEL;
    }
    return {
      name,
      color,
      meta,
      exists: existingNames.has(name),
      created: created.has(name),
      error: failed?.get(name)
    };
  });

  return {
    naming,
    setNaming,
    structured,
    text,
    setText,
    setLeft,
    targets,
    // Some of the names exist already, so the form can't create them.
    blocked: existing.length > 0,
    pending,
    suggestions,
    newFolders,
    fieldHelp,
    rows
  };
};

export type NamingState = ReturnType<typeof useNaming>;

export default useNaming;
