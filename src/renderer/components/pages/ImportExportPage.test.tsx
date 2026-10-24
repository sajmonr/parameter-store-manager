// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useImportStore } from '../../state/import';
import { renderWithProviders } from '../../test/render';
import { createTestState, makeParameter } from '../../test/testState';
import ImportExportPage from './ImportExportPage';

vi.mock('../../services', () => import('../../test/mockServices'));

const mode = (name: string) =>
  within(
    screen.getByRole('radiogroup', { name: 'Export or import' })
  ).getByRole('radio', { name: new RegExp(`^${name}:`) });

beforeEach(() => {
  vi.clearAllMocks();
});

const setup = () =>
  renderWithProviders(<ImportExportPage />, {
    queryClient: createTestState({ parameters: [makeParameter('/a')] })
  });

describe('ImportExportPage', () => {
  it('starts on Export and switches to Import with the cards', async () => {
    const user = userEvent.setup();
    setup();

    expect(mode('Export')).toBeChecked();
    expect(
      screen.getByRole('button', { name: /^Export .* as CSV$/ })
    ).toBeVisible();

    await user.click(mode('Import'));

    expect(mode('Import')).toBeChecked();
    expect(
      screen.getByText('Drop a .json file here, or', { exact: false })
    ).toBeVisible();
    expect(
      screen.queryByRole('button', { name: /^Export .* as CSV$/ })
    ).toBeNull();
  });

  it('keeps the mode while an import runs', async () => {
    const user = userEvent.setup();
    setup();
    await user.click(mode('Import'));

    act(() => useImportStore.setState({ running: true }));
    await user.click(mode('Export'));

    expect(mode('Import')).toBeChecked();
    expect(mode('Export')).toHaveAttribute('aria-disabled', 'true');
  });
});
