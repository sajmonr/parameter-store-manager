import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRateLimiter } from './ssmRateLimit';

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

// A call that takes `ms` and records when it was sent.
const recorder = (ms: number) => {
  const sent: number[] = [];
  const call = () => {
    sent.push(Date.now());
    return new Promise<void>(resolve => setTimeout(resolve, ms));
  };
  return { sent, call };
};

// The most calls sent in any one second.
const peakPerSecond = (sent: number[]) =>
  Math.max(
    ...sent.map(
      start => sent.filter(t => t >= start && t < start + 1000).length
    )
  );

describe('createRateLimiter', () => {
  it('sends at most the rate per second, even with fast calls', async () => {
    const limiter = createRateLimiter({ perSecond: 20, concurrency: 4 });
    const { sent, call } = recorder(10);

    const all = Promise.all(
      Array.from({ length: 100 }, () => limiter.schedule(call))
    );
    await vi.runAllTimersAsync();
    await all;

    expect(sent).toHaveLength(100);
    expect(peakPerSecond(sent)).toBe(20);
    // 100 calls at 20/s: the last starts after 4 s, not much later.
    expect(sent.at(-1)! - sent[0]!).toBeLessThan(5000);
  });

  it('keeps at most the concurrency in flight with slow calls', async () => {
    const limiter = createRateLimiter({ perSecond: 20, concurrency: 4 });
    let inFlight = 0;
    let peak = 0;
    const call = async () => {
      inFlight += 1;
      peak = Math.max(peak, inFlight);
      await new Promise(resolve => setTimeout(resolve, 2000));
      inFlight -= 1;
    };

    const all = Promise.all(
      Array.from({ length: 12 }, () => limiter.schedule(call))
    );
    await vi.runAllTimersAsync();
    await all;

    expect(peak).toBe(4);
  });

  it('holds the cap for calls scheduled at different times', async () => {
    const limiter = createRateLimiter({ perSecond: 20, concurrency: 4 });
    const { sent, call } = recorder(5);

    // Like describe pages arriving every 300 ms, each with 5 batches.
    const pages: Promise<unknown>[] = [];
    for (let page = 0; page < 10; page += 1) {
      pages.push(
        Promise.all(Array.from({ length: 5 }, () => limiter.schedule(call)))
      );
      await vi.advanceTimersByTimeAsync(300);
    }
    await vi.runAllTimersAsync();
    await Promise.all(pages);

    expect(sent).toHaveLength(50);
    expect(peakPerSecond(sent)).toBeLessThanOrEqual(20);
  });

  it('passes on results and errors', async () => {
    vi.useRealTimers();
    const limiter = createRateLimiter({ perSecond: 20, concurrency: 4 });

    await expect(limiter.schedule(async () => 'value')).resolves.toBe('value');
    await expect(
      limiter.schedule(() => Promise.reject(new Error('failed')))
    ).rejects.toThrow('failed');
  });

  it('drops a queued call whose check fails, without sending it', async () => {
    const limiter = createRateLimiter({ perSecond: 2, concurrency: 4 });
    const { sent, call } = recorder(10);
    let cancelled = false;
    const check = () => {
      if (cancelled) throw new Error('cancelled');
    };

    const results = Array.from({ length: 6 }, () =>
      limiter.schedule(call, { check }).then(
        () => 'sent',
        (error: Error) => error.message
      )
    );
    await vi.advanceTimersByTimeAsync(0);
    expect(sent).toHaveLength(2);
    cancelled = true;
    await vi.runAllTimersAsync();

    expect(await Promise.all(results)).toEqual([
      'sent',
      'sent',
      'cancelled',
      'cancelled',
      'cancelled',
      'cancelled'
    ]);
    expect(sent).toHaveLength(2);
  });

  it('lets other callers go when one caller is dropped', async () => {
    const limiter = createRateLimiter({ perSecond: 2, concurrency: 4 });
    const { sent, call } = recorder(10);

    const dropped = Array.from({ length: 4 }, () =>
      limiter
        .schedule(call, {
          check: () => {
            throw new Error('stale');
          }
        })
        .catch(() => 'dropped')
    );
    const kept = Array.from({ length: 2 }, () => limiter.schedule(call));
    await vi.advanceTimersByTimeAsync(0);

    // Dropped calls don't use up the rate: both kept calls go at once.
    expect(sent).toHaveLength(2);
    expect(await Promise.all(dropped)).toEqual(Array(4).fill('dropped'));
    await vi.runAllTimersAsync();
    await Promise.all(kept);
  });
});
