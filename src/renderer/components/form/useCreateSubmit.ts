import { useState } from 'react';
import type { EditableParameterType } from '../../../shared/parameterTypes';
import { useCreateParameters } from '../../state/parameters';
import { uiActions } from '../../state/ui';
import { notifyError, notifySuccess } from '../../utils/notify';

export interface FormValues {
  description: string;
  type: EditableParameterType;
  kmsKey: string;
  value: string;
}

// After a create of several parameters that partly failed.
export interface Outcome {
  created: ReadonlySet<string>;
  failed: ReadonlyMap<string, string>;
}

const NO_NAMES: ReadonlySet<string> = new Set();

// Creates the form's parameters. When some of several fail, the outcome
// keeps what was created, so a retry creates only the rest.
const useCreateSubmit = () => {
  const createParameters = useCreateParameters();
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const created = outcome?.created ?? NO_NAMES;

  // Opens the first created parameter.
  const finish = (targets: string[], key: string, all: string[]) => {
    const [first] = targets.filter(name => all.includes(name));
    if (targets.length > 1) {
      notifySuccess(`Created in ${targets.length} environments`, {
        description: key
      });
    } else {
      notifySuccess('Parameter created', { description: first });
    }
    uiActions.showCreatedParameter(first!);
  };

  // `targets` are every name the form creates, `key` what they share.
  const submit = (targets: string[], key: string, values: FormValues) => {
    const pending = targets.filter(name => !created.has(name));
    void createParameters
      .mutateAsync(
        pending.map(name => ({
          name,
          description: values.description,
          type: values.type,
          kmsKey: values.kmsKey,
          value: values.value,
          overwrite: false
        }))
      )
      .then(result => {
        const all = [...created, ...result.created];
        if (!result.failed.size) {
          finish(targets, key, all);
        } else if (targets.length === 1) {
          notifyError('Parameter was not created', undefined, {
            description: [...result.failed.values()][0]
          });
        } else {
          setOutcome({ created: new Set(all), failed: result.failed });
        }
      });
  };

  return {
    submit,
    submitting: createParameters.isPending,
    outcome,
    created,
    // What was created or failed no longer applies to another name.
    clearOutcome: () => setOutcome(null)
  };
};

export default useCreateSubmit;
