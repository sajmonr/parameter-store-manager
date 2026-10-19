// How parameter paths name a service and an environment. Shared by the main
// process (which stores and validates it) and the renderer (which reads paths
// with it). Nothing is detected: the user configures all of it.

// 'env-first' reads /{environment}/{service}/…, 'svc-first' /{service}/{environment}/….
export const LAYOUTS = ['env-first', 'svc-first'] as const;
export type Layout = (typeof LAYOUTS)[number];

// antd Tag presets. A new environment gets the next one in this order.
export const ENVIRONMENT_COLORS = [
  'green',
  'gold',
  'red',
  'blue',
  'purple',
  'cyan'
] as const;
export type EnvironmentColor = (typeof ENVIRONMENT_COLORS)[number];

export interface StructureEnvironment {
  segment: string;
  color: EnvironmentColor;
}

export interface StructureService {
  segment: string;
  // The environments the service is deployed to. Other combinations are
  // listed under Other paths.
  environments: string[];
}

export interface Structure {
  enabled: boolean;
  layout: Layout;
  // In order: it is the order of the environment tabs and columns.
  environments: StructureEnvironment[];
  services: StructureService[];
}

export const DEFAULT_STRUCTURE: Structure = {
  enabled: false,
  layout: 'env-first',
  environments: [
    { segment: 'development', color: 'green' },
    { segment: 'staging', color: 'gold' },
    { segment: 'production', color: 'red' }
  ],
  services: []
};

// The views of the parameter list.
export const PARAMETER_VIEWS = ['services', 'environments', 'paths'] as const;
export type ParameterView = (typeof PARAMETER_VIEWS)[number];

// Why `segment` can't name an environment or service, or null when it can.
// `others` are the segments already in the same list. An empty delimiter
// skips the delimiter check.
export const segmentError = (
  segment: string,
  delimiter: string,
  others: readonly string[] = []
) => {
  if (!segment) return 'Enter a path segment.';
  if (/\s/.test(segment)) return "Can't contain spaces.";
  if (delimiter && segment.includes(delimiter)) {
    return `Can't contain "${delimiter}".`;
  }
  if (others.includes(segment)) return 'Already in the list.';
  return null;
};

// Each segment checked against the ones before it in its list.
const listErrors = (kind: string, segments: string[], delimiter: string) =>
  segments.flatMap((segment, index) => {
    const error = segmentError(segment, delimiter, segments.slice(0, index));
    return error ? [`${kind} "${segment}": ${error}`] : [];
  });

// Everything wrong with a structure, or an empty list when it's valid.
export const structureErrors = (structure: Structure, delimiter: string) => {
  const environments = structure.environments.map(e => e.segment);
  const errors = [
    ...listErrors('Environment', environments, delimiter),
    ...listErrors(
      'Service',
      structure.services.map(s => s.segment),
      delimiter
    )
  ];
  structure.services.forEach(service => {
    service.environments.forEach((env, index) => {
      if (!environments.includes(env)) {
        errors.push(`Service "${service.segment}": no environment "${env}".`);
      } else if (service.environments.indexOf(env) !== index) {
        errors.push(`Service "${service.segment}": "${env}" is listed twice.`);
      }
    });
  });
  return errors;
};

// The first configured segment that contains `delimiter`, which then can't be
// the path delimiter. Null when there is none.
export const delimiterConflict = (structure: Structure, delimiter: string) =>
  (delimiter &&
    [...structure.environments, ...structure.services]
      .map(item => item.segment)
      .find(segment => segment.includes(delimiter))) ||
  null;
