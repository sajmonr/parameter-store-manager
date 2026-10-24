// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DEFAULT_STRUCTURE } from '../../shared/structure';
import type { Structure } from '../../shared/structure';
import * as api from '../test/mockServices';
import { uiActions, useUiStore } from '../state/ui';
import { saveSettingsAndApply } from '../state/settingsChanges';
import { renderWithProviders } from '../test/render';
import { createTestState, makeParameter } from '../test/testState';
import AppShell from './AppShell';

vi.mock('../services', () => import('../test/mockServices'));

const structure: Structure = {
  ...DEFAULT_STRUCTURE,
  enabled: true,
  services: [
    {
      segment: 'compass',
      environments: ['development', 'staging', 'production']
    },
    { segment: 'billing', environments: ['development', 'production'] }
  ]
};

const parameters = [
  makeParameter('/development/compass/Flag', { Value: 'on' }),
  makeParameter('/staging/compass/Flag', { Value: 'on' }),
  makeParameter('/production/compass/Flag', { Value: 'off' }),
  makeParameter('/development/compass/AppServer/Port', { Value: '80' }),
  makeParameter('/staging/compass/AppServer/Port', { Value: '80' }),
  makeParameter('/production/compass/AppServer/Port', { Value: '80' }),
  makeParameter('/development/compass/Secret', {
    Value: 'dev-secret',
    Type: 'SecureString'
  }),
  makeParameter('/staging/compass/Secret', {
    Value: 'dev-secret',
    Type: 'SecureString'
  }),
  makeParameter('/development/billing/Key', { Value: 'k' }),
  makeParameter('/random/Thing')
];

const renderApp = () =>
  renderWithProviders(<AppShell />, {
    queryClient: createTestState({ settings: { structure } })
  });

const grid = () => screen.getByRole('table', { name: 'Compare environments' });
const keyNames = () =>
  within(grid())
    .getAllByRole('rowheader')
    .map(cell => cell.querySelector('.ant-typography')!.textContent);
const rowOf = (key: string) =>
  within(grid())
    .getAllByRole('row')
    .find(row =>
      within(row).queryByRole('rowheader')?.textContent?.startsWith(key)
    )!;
const modeSwitch = () => screen.getByLabelText('Mode');
const filter = () => screen.getByLabelText('Compare filter');

const startComparing = async () => {
  const user = userEvent.setup();
  renderApp();
  await screen.findByText('Port');
  await user.click(within(modeSwitch()).getByText('Compare'));
  await screen.findByRole('table', { name: 'Compare environments' });
  return user;
};

beforeEach(() => {
  vi.clearAllMocks();
  api.serveParameters(parameters);
});

describe('Compare mode', () => {
  it('shows one column per environment and marks the differences', async () => {
    await startComparing();

    expect(
      within(grid())
        .getAllByRole('columnheader')
        .map(header => header.textContent)
    ).toEqual(['Key', 'development3', 'staging3', 'production2']);
    expect(keyNames()).toEqual(['Flag', 'Secret', 'Port']);
    expect(within(grid()).getByText('AppServer')).toBeInTheDocument();

    expect(within(rowOf('Flag')).getByText('Differs')).toBeInTheDocument();
    expect(within(rowOf('Flag')).queryByText('Missing')).toBeNull();
    expect(within(rowOf('Secret')).getByText('Missing')).toBeInTheDocument();
    // Same decrypted value in each environment that has it.
    expect(within(rowOf('Secret')).queryByText('Differs')).toBeNull();
    expect(within(rowOf('Secret')).getByText('Not set')).toBeInTheDocument();
    expect(within(rowOf('Port')).queryByText('Differs')).toBeNull();

    // The environment tabs make way for the filter.
    expect(screen.queryByLabelText('Environment')).toBeNull();
    expect(screen.getByText('Comparing 3 environments')).toBeInTheDocument();
    expect(
      screen.getByText('3 of 3 keys · 3 environments')
    ).toBeInTheDocument();
  });

  it('filters to the keys that differ or are missing', async () => {
    const user = await startComparing();

    expect(within(filter()).getByText('All').parentElement).toHaveTextContent(
      'All3'
    );
    await user.click(within(filter()).getByText('Differs'));
    expect(keyNames()).toEqual(['Flag']);
    await user.click(within(filter()).getByText('Missing'));
    expect(keyNames()).toEqual(['Secret']);
    expect(
      screen.getByText('1 of 3 keys · 3 environments')
    ).toBeInTheDocument();

    act(() => uiActions.setQuery('Flag'));
    expect(
      screen.getByText('Every key is set in each environment')
    ).toBeInTheDocument();
    act(() => uiActions.setQuery('nothing-like-it'));
    expect(screen.getByText('No keys match the search')).toBeInTheDocument();
  });

  it('keeps to the breadcrumb folder', async () => {
    await startComparing();

    act(() =>
      uiActions.setLocation({
        view: 'services',
        service: 'compass',
        env: 'development',
        folder: 'AppServer/'
      })
    );
    expect(keyNames()).toEqual(['Port']);
  });

  it('masks SecureStrings until revealed, without opening the pane', async () => {
    const user = await startComparing();

    const secret = rowOf('Secret');
    expect(within(secret).queryByText('dev-secret')).toBeNull();
    await user.click(within(secret).getAllByLabelText('Reveal')[0]!);
    expect(within(secret).getAllByText('dev-secret')).toHaveLength(1);
    expect(useUiStore.getState().selectedName).toBeNull();
    expect(useUiStore.getState().revealed).toEqual(
      new Set(['/development/compass/Secret'])
    );
  });

  it('opens a value in the detail pane and stays in compare mode', async () => {
    const user = await startComparing();

    await user.click(within(rowOf('Flag')).getByText('off'));
    expect(useUiStore.getState().selectedName).toBe('/production/compass/Flag');
    expect(grid()).toBeInTheDocument();
    expect(within(rowOf('Flag')).getByRole('rowheader').className).toMatch(
      /selectedKey/
    );

    await user.keyboard('{Escape}');
    await waitFor(() => expect(useUiStore.getState().selectedName).toBeNull());
    expect(grid()).toBeInTheDocument();
  });

  it('keeps the mode across services and only shows the switch for a service', async () => {
    const user = await startComparing();

    act(() =>
      uiActions.setLocation({
        view: 'services',
        service: 'billing',
        env: 'development',
        folder: ''
      })
    );
    expect(keyNames()).toEqual(['Key']);

    await user.click(within(screen.getByLabelText('View')).getByText('Paths'));
    expect(screen.queryByLabelText('Mode')).toBeNull();
    expect(
      screen.queryByRole('table', { name: 'Compare environments' })
    ).toBeNull();
  });

  it('goes back to the table when grouping is turned off', async () => {
    await startComparing();

    await act(() =>
      saveSettingsAndApply({ structure: { ...structure, enabled: false } })
    );
    expect(useUiStore.getState().compare).toBe(false);
  });
});
