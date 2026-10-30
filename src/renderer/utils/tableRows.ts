// The parameter table's rows.
import { groupByService, isWholeEnvironment } from './location';
import type { Location, LocationContext } from './location';
import type { ParameterEntry } from './parameterList';

// A whole environment's rows come under a header row per service.
export interface GroupRow {
  // The row key; parameter names can't contain brackets.
  Name: string;
  service: string;
  count: number;
}

export type TableRow = ParameterEntry | GroupRow;

export const isGroupRow = (row: TableRow): row is GroupRow => 'service' in row;

// The parameters, with a header row before each service's when `location`
// is a whole environment.
export const tableRowsOf = (
  parameters: ParameterEntry[],
  location: Location,
  context: LocationContext
): TableRow[] => {
  if (!isWholeEnvironment(location)) return parameters;
  return groupByService(parameters, context).flatMap(
    ({ service, parameters: rows }) => [
      {
        Name: JSON.stringify(['group', service]),
        service,
        count: rows.length
      },
      ...rows
    ]
  );
};
