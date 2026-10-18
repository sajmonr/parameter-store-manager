// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import * as api from '../../test/mockServices';
import { useUiStore } from '../../state/ui';
import { renderWithProviders } from '../../test/render';
import { createTestState, makeParameter } from '../../test/testState';
import AppHeader from './AppHeader';

vi.mock('../../services', () => import('../../test/mockServices'));

const setup = () =>
  renderWithProviders(<AppHeader />, {
    queryClient: createTestState({ parameters: [makeParameter('/a')] })
  });

const openMore = async (user: ReturnType<typeof userEvent.setup>) => {
  await user.click(screen.getByRole('button', { name: 'More' }));
};

beforeEach(() => {
  vi.clearAllMocks();
  api.serveParameters([makeParameter('/a')]);
});

describe('AppHeader', () => {
  it('has New parameter as its only main button', () => {
    setup();
    expect(
      screen.getByRole('button', { name: /New parameter/ })
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Settings' })
    ).not.toBeInTheDocument();
  });

  it('opens the export and settings from the More menu', async () => {
    const user = userEvent.setup();
    setup();

    await openMore(user);
    await user.click(await screen.findByText('Export as CSV'));
    expect(useUiStore.getState().exportOpen).toBe(true);

    await openMore(user);
    await user.click(await screen.findByText('Settings'));
    expect(useUiStore.getState().settingsOpen).toBe(true);
  });

  it('refreshes from the More menu and from the sync status', async () => {
    const user = userEvent.setup();
    setup();

    await openMore(user);
    await user.click(await screen.findByText('Refresh'));
    await waitFor(() =>
      expect(api.parametersService.describe).toHaveBeenCalledTimes(1)
    );

    await user.click(await screen.findByRole('button', { name: /Synced/ }));
    await waitFor(() =>
      expect(api.parametersService.describe).toHaveBeenCalledTimes(2)
    );
  });

  it('opens the settings with Cmd/Ctrl+,', () => {
    setup();
    fireEvent.keyDown(window, { key: ',', ctrlKey: true });
    expect(useUiStore.getState().settingsOpen).toBe(true);
  });
});
