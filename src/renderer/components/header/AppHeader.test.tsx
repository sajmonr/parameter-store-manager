// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import * as api from '../../test/mockServices';
import { uiActions, useUiStore } from '../../state/ui';
import { renderWithProviders } from '../../test/render';
import { createTestState, makeParameter } from '../../test/testState';
import AppHeader from './AppHeader';

vi.mock('../../services', () => import('../../test/mockServices'));

const setup = () =>
  renderWithProviders(<AppHeader />, {
    queryClient: createTestState({ parameters: [makeParameter('/a')] })
  });

beforeEach(() => {
  vi.clearAllMocks();
  api.serveParameters([makeParameter('/a')]);
});

describe('AppHeader', () => {
  it('marks the profile chip FAKE with the fake development data', async () => {
    api.sourceService.get.mockResolvedValueOnce('fake');
    setup();
    expect(await screen.findByText('FAKE')).toBeInTheDocument();
  });

  it('has no FAKE mark with AWS data', async () => {
    setup();
    await waitFor(() => expect(api.sourceService.get).toHaveBeenCalled());
    expect(screen.queryByText('FAKE')).not.toBeInTheDocument();
  });

  it('has New parameter and Refresh, and no More menu', () => {
    setup();
    expect(
      screen.getByRole('button', { name: /New parameter/ })
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Refresh' })).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'More' })
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Settings' })
    ).not.toBeInTheDocument();
  });

  it('refreshes the parameters', async () => {
    const user = userEvent.setup();
    setup();

    await user.click(screen.getByRole('button', { name: 'Refresh' }));
    await waitFor(() =>
      expect(api.parametersService.describe).toHaveBeenCalled()
    );
  });

  it('opens the AWS connection settings from the profile chip', async () => {
    const user = userEvent.setup();
    setup();
    uiActions.showSettingsSection('display');

    await user.click(screen.getByRole('button', { name: /default/ }));
    expect(useUiStore.getState().page).toBe('settings');
    expect(useUiStore.getState().settingsSection).toBe('aws');
  });
});
