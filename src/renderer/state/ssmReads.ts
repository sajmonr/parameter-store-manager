// Reads from SSM shared by the parameter load and the export. GetParameter,
// GetParameters and GetParametersByPath share one budget per account and
// region (40 calls/s by default) with every other caller, including
// production services, so the app keeps well under it.
import { MAX_NAMES_PER_REQUEST } from '../../main/endpoints/parameters/getParameterValues/getParameterValues.contract';
import { parametersService } from '../services';
import type { ParameterMetadata } from '../services';
import { chunk } from '../utils/batch';
import { createRateLimiter } from '../utils/rateLimiter';
import type { RateLimit } from '../utils/rateLimiter';

// About half the default budget.
export const SSM_READ_LIMIT: RateLimit = { perSecond: 20, concurrency: 4 };

// Every GetParameters call the renderer makes goes through this one, so a
// load and an export running together share the cap.
export const ssmReads = createRateLimiter(SSM_READ_LIMIT);

// Lists every page of DescribeParameters, one after another, handing each to
// `onPage`. Stops early, returning false, when `onPage` returns false.
export const describeAllPages = async (
  onPage: (parameters: ParameterMetadata[]) => boolean | void,
  beginsWith?: string
) => {
  let nextToken: string | undefined;
  do {
    const page = await parametersService.describe(nextToken, beginsWith);
    if (onPage(page.parameters) === false) return false;
    ({ nextToken } = page);
  } while (nextToken);
  return true;
};

// Starts a GetParameters call per batch of `names`, through the shared read
// limit. `check` runs before each call is sent; throwing drops it unsent.
export const readValueBatches = (
  names: string[],
  { decrypt, check }: { decrypt: boolean; check: () => void }
) =>
  chunk(names, MAX_NAMES_PER_REQUEST).map(batch => ({
    batch,
    values: ssmReads.schedule(
      () => parametersService.getValues(batch, decrypt),
      { check }
    )
  }));
