// Thin wrapper around the `window.api` bridge exposed by the preload script.

// Turns an { ok, result | error } response back into a value or a thrown Error.
export const unwrap = response => {
  if (response && response.ok) return response.result;
  const { name, message, code } = (response && response.error) || {};
  const error = new Error(message || 'Unknown error');
  error.name = name || 'Error';
  error.code = code;
  throw error;
};

const call = (fn, ...args) => fn(...args).then(unwrap);

// Dates cross the IPC bridge as ISO strings.
const reviveParameter = parameter => ({
  ...parameter,
  LastModifiedDate: parameter.LastModifiedDate
    ? new Date(parameter.LastModifiedDate)
    : undefined
});

const bridge = () => window.api;

export const describeParameters = nextToken =>
  call(bridge().parameters.describe, nextToken).then(res => ({
    ...res,
    parameters: res.parameters.map(reviveParameter)
  }));

export const getParameters = names =>
  call(bridge().parameters.getValues, names).then(res => ({
    ...res,
    parameters: res.parameters.map(reviveParameter)
  }));

export const putParameter = params => call(bridge().parameters.put, params);

export const deleteParameter = name => call(bridge().parameters.delete, name);

export const listKmsAliases = () => call(bridge().kms.listAliases);

export const getAllSettings = () => call(bridge().settings.getAll);

export const setSettings = values => call(bridge().settings.set, values);

export const onSettingsChange = callback =>
  bridge().settings.onChange(callback);
