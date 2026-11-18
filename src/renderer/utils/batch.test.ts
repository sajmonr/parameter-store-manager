import { afterEach, describe, expect, it, vi } from 'vitest';
import { chunk, retryWithBackoff, settleEach } from './batch';

const throttled = () =>
  Object.assign(new Error('Rate exceeded'), { name: 'ThrottlingException' });

describe('chunk', () => {
  it('splits items into runs of at most the size', () => {
    expect(chunk([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]]);
    expect(chunk([], 2)).toEqual([]);
  });
});

describe('settleEach', () => {
  it('runs every item and reports failures by name', async () => {
    const onSettled = vi.fn();
    const settled = await settleEach(['a', 'b', 'c'], {
      nameOf: item => item,
      task: async item => {
        if (item === 'b') throw new Error('denied');
      },
      concurrency: 2,
      onSettled
    });
    expect(settled.done.sort()).toEqual(['a', 'c']);
    expect([...settled.failed]).toEqual([['b', 'denied']]);
    expect(onSettled).toHaveBeenCalledTimes(3);
  });
});

describe('retryWithBackoff', () => {
  afterEach(() => vi.useRealTimers());

  it('retries a throttled call after 1 and 2 seconds', async () => {
    vi.useFakeTimers();
    const call = vi
      .fn()
      .mockRejectedValueOnce(throttled())
      .mockRejectedValueOnce(throttled())
      .mockResolvedValue('saved');
    const result = retryWithBackoff(call);
    await vi.advanceTimersByTimeAsync(999);
    expect(call).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(1);
    expect(call).toHaveBeenCalledTimes(2);
    await vi.advanceTimersByTimeAsync(2000);
    await expect(result).resolves.toBe('saved');
  });

  it('gives up after three retries', async () => {
    vi.useFakeTimers();
    const call = vi.fn().mockRejectedValue(throttled());
    const result = retryWithBackoff(call);
    const settled = expect(result).rejects.toThrow('Rate exceeded');
    await vi.advanceTimersByTimeAsync(7000);
    await settled;
    expect(call).toHaveBeenCalledTimes(4);
  });

  it("doesn't retry other errors", async () => {
    const call = vi.fn().mockRejectedValue(new Error('denied'));
    await expect(retryWithBackoff(call)).rejects.toThrow('denied');
    expect(call).toHaveBeenCalledTimes(1);
  });
});
