// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import FormatCards from './FormatCards';
import { FORMATS } from './formats';
import type { Format } from './formats';

// A format only Export can use, added the way a new one would be.
const exportOnly: Format = {
  ...FORMATS[0]!,
  id: 'csv',
  label: 'Sheet',
  description: 'Export only.',
  canImport: false,
  parse: undefined
};
const formats = [exportOnly, FORMATS[1]!];

describe('FormatCards', () => {
  it('shows a format Import can’t read, dimmed and not selectable', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <FormatCards
        mode="import"
        value="json"
        onChange={onChange}
        formats={formats}
      />
    );

    const sheet = screen.getByRole('radio', { name: /^Sheet/ });
    expect(sheet).toHaveAttribute('aria-disabled', 'true');
    await user.click(sheet);
    expect(onChange).not.toHaveBeenCalled();
    await user.hover(sheet);
    expect(await screen.findByText("Can't be imported")).toBeInTheDocument();
  });

  it('lets Export pick it', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <FormatCards
        mode="export"
        value="json"
        onChange={onChange}
        formats={formats}
      />
    );

    await user.click(screen.getByRole('radio', { name: /^Sheet/ }));
    expect(onChange).toHaveBeenCalledWith('csv');
  });
});
