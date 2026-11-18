// Helpers for running many AWS calls: in batches, a few at a time, and again
// after throttling.
import pAll from 'p-all';
import type { ApiError } from '../clients/call';
import { describeError } from './awsErrors';

export const chunk = <T>(items: T[], size: number) => {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
};

interface Settled {
  // The names whose task finished.
  done: string[];
  // Each name whose task failed, with why.
  failed: Map<string, string>;
}

// Runs `task` for each item, `concurrency` at a time. A failed one doesn't
// stop the others; `onSettled` runs as each finishes either way.
export const settleEach = async <T>(
  items: T[],
  {
    nameOf,
    task,
    concurrency,
    onSettled
  }: {
    nameOf: (item: T) => string;
    task: (item: T) => Promise<unknown>;
    concurrency: number;
    onSettled?: () => void;
  }
): Promise<Settled> => {
  const settled: Settled = { done: [], failed: new Map() };
  await pAll(
    items.map(item => async () => {
      try {
        await task(item);
        settled.done.push(nameOf(item));
      } catch (error) {
        settled.failed.set(nameOf(item), describeError(error as ApiError));
      } finally {
        onSettled?.();
      }
    }),
    { concurrency }
  );
  return settled;
};

const isThrottled = ({ name, code }: ApiError) =>
  name === 'ThrottlingException' || code === 'ThrottlingException';

const THROTTLE_RETRIES = 3;
// Doubled after each retry.
const THROTTLE_BACKOFF_MS = 1000;

// Runs `call`, and while it fails with throttling waits 1, 2 and then 4
// seconds and runs it again.
export const retryWithBackoff = async <T>(call: () => Promise<T>) => {
  for (let attempt = 0; ; attempt += 1) {
    try {
      return await call();
    } catch (error) {
      if (attempt >= THROTTLE_RETRIES || !isThrottled(error as ApiError)) {
        throw error;
      }
      await new Promise(resolve =>
        setTimeout(resolve, THROTTLE_BACKOFF_MS * 2 ** attempt)
      );
    }
  }
};
