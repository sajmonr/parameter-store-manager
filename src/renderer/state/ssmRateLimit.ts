// Limits how fast the app reads from SSM. GetParameter, GetParameters and
// GetParametersByPath share one budget per account and region (40 calls/s by
// default) with every other caller, including production services, so the
// app keeps well under it.

export interface RateLimit {
  // Calls started in any one second.
  perSecond: number;
  // Calls in flight at once, so a slow network doesn't pile up requests.
  concurrency: number;
}

export interface Scheduled {
  // Runs just before the call is sent; throwing drops the call unsent.
  check?: () => void;
}

interface Task {
  run: () => Promise<unknown>;
  check?: () => void;
  resolve: (value: unknown) => void;
  reject: (error: unknown) => void;
}

const WINDOW_MS = 1000;

export const createRateLimiter = ({ perSecond, concurrency }: RateLimit) => {
  const queue: Task[] = [];
  // When the calls of the last second started, oldest first.
  let starts: number[] = [];
  let active = 0;
  let timer: ReturnType<typeof setTimeout> | null = null;

  const pump = () => {
    while (active < concurrency) {
      const [task] = queue;
      if (!task) return;
      try {
        task.check?.();
      } catch (error) {
        queue.shift();
        task.reject(error);
        continue;
      }

      const now = Date.now();
      starts = starts.filter(start => now - start < WINDOW_MS);
      const [oldest] = starts;
      if (oldest !== undefined && starts.length >= perSecond) {
        // The check runs again when the call can go, so a call dropped in
        // the meantime is never sent.
        if (!timer) {
          timer = setTimeout(
            () => {
              timer = null;
              pump();
            },
            oldest + WINDOW_MS - now
          );
        }
        return;
      }

      queue.shift();
      starts.push(now);
      active += 1;
      task
        .run()
        .then(task.resolve, task.reject)
        .finally(() => {
          active -= 1;
          pump();
        });
    }
  };

  const schedule = <T>(
    run: () => Promise<T>,
    { check }: Scheduled = {}
  ): Promise<T> =>
    new Promise<T>((resolve, reject) => {
      queue.push({
        run,
        check,
        resolve: resolve as (value: unknown) => void,
        reject
      });
      pump();
    });

  return { schedule };
};

// About half the default budget.
export const SSM_READ_LIMIT: RateLimit = { perSecond: 20, concurrency: 4 };

// Every GetParameters call the renderer makes goes through this one, so a
// load and an export running together share the cap.
export const ssmReads = createRateLimiter(SSM_READ_LIMIT);
