// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import PartialFailureAlert, { partialFailureText } from './PartialFailureAlert';

describe('PartialFailureAlert', () => {
  it('says how many went through and how many failed', () => {
    expect(partialFailureText('Imported', 1200, 1500)).toBe(
      `Imported ${(1200).toLocaleString()} of ${(1500).toLocaleString()}. 300 failed.`
    );
  });

  it('offers a retry only with a handler', () => {
    const onRetry = vi.fn();
    const { rerender } = render(
      <PartialFailureAlert verb="Created" done={1} total={3} />
    );
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
    rerender(
      <PartialFailureAlert
        verb="Created"
        done={1}
        total={3}
        onRetry={onRetry}
      />
    );
    fireEvent.click(screen.getByRole('button', { name: 'Retry failed' }));
    expect(onRetry).toHaveBeenCalled();
  });
});
