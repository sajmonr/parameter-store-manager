// How parameter paths name a service and an environment. Shared by the main
// process (which stores and validates it) and the renderer (which reads paths
// with it). Nothing is detected: the user configures all of it.

// 'env-first' reads /{environment}/{service}/…, 'svc-first' /{service}/{environment}/….
export const LAYOUTS = ['env-first', 'svc-first'] as const;
export type Layout = (typeof LAYOUTS)[number];

// Environment colours are stored as '#rrggbb'.
export const isHexColor = (value: string) => /^#[0-9a-f]{6}$/i.test(value);

// antd's green, gold, red, blue, purple and cyan. A new environment gets the
// next one in this order; the colour picker suggests them.
export const ENVIRONMENT_COLORS = [
  '#52c41a',
  '#faad14',
  '#f5222d',
  '#1677ff',
  '#722ed1',
  '#13c2c2'
] as const;

// Green, also used for a stored colour that isn't a hex colour.
export const DEFAULT_ENVIRONMENT_COLOR = ENVIRONMENT_COLORS[0];

export interface StructureEnvironment {
  segment: string;
  color: string;
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
    { segment: 'development', color: ENVIRONMENT_COLORS[0] },
    { segment: 'staging', color: ENVIRONMENT_COLORS[1] },
    { segment: 'production', color: ENVIRONMENT_COLORS[2] }
  ],
  services: []
};

// The views of the parameter list.
export const PARAMETER_VIEWS = ['services', 'environments', 'paths'] as const;
export type ParameterView = (typeof PARAMETER_VIEWS)[number];

// Whether the delimiter starts inside `segment`: it contains the delimiter, or
// ends with the start of a longer one ('dev.' and '..'). Either way the path
// would split in the wrong place.
const clashes = (segment: string, delimiter: string) =>
  `${segment}${delimiter}`.indexOf(delimiter) !== segment.length;

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
  if (delimiter && clashes(segment, delimiter)) {
    return `Can't end with part of "${delimiter}".`;
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

// The first configured segment that clashes with `delimiter`, which then can't
// be the path delimiter. Null when there is none.
export const delimiterConflict = (structure: Structure, delimiter: string) =>
  (delimiter &&
    [...structure.environments, ...structure.services]
      .map(item => item.segment)
      .find(segment => clashes(segment, delimiter))) ||
  null;
