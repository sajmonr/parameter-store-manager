// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DEFAULT_STRUCTURE } from '../../shared/structure';
import type { Structure } from '../../shared/structure';
import * as api from '../test/mockServices';
import { getLocation, useUiStore } from '../state/ui';
import { renderWithProviders } from '../test/render';
import { createTestState, makeParameter } from '../test/testState';
import AppShell from './AppShell';

vi.mock('../services', () => import('../test/mockServices'));

const structure: Structure = {
  ...DEFAULT_STRUCTURE,
  enabled: true,
  services: [
    { segment: 'compass', environments: ['development', 'staging'] },
    { segment: 'billing', environments: ['production'] }
  ]
};

const parameters = [
  makeParameter('/development/compass/AppServer/Port'),
  makeParameter('/development/compass/AppServer/Title'),
  makeParameter('/development/compass/Flag'),
  makeParameter('/staging/compass/AppServer/Port'),
  makeParameter('/production/billing/Key'),
  makeParameter('/random/Thing')
];

const renderApp = (settings: Partial<{ structure: Structure }> = {}) =>
  renderWithProviders(<AppShell />, {
    queryClient: createTestState({ settings: { structure, ...settings } })
  });

const table = () => document.querySelector<HTMLElement>('.ant-table')!;
const sidebar = () => document.querySelector<HTMLElement>('.ant-layout-sider')!;
const rowNames = () =>
  [...table().querySelectorAll('.ant-table-row[data-row-key]')].map(row =>
    row.getAttribute('data-row-key')
  );
const viewSwitcher = () => screen.getByRole('radiogroup', { name: 'View' });
const envTabs = () => screen.getByRole('radiogroup', { name: 'Environment' });

beforeEach(() => {
  vi.clearAllMocks();
  api.serveParameters(parameters);
});

describe('Services view', () => {
  it('opens on the first service, with folders and environment tabs', async () => {
    renderApp();
    await screen.findByText('Port');

    expect(within(viewSwitcher()).getByTitle('Services')).toBeInTheDocument();
    expect(within(sidebar()).getAllByText('Services')).toHaveLength(2);
    expect(within(sidebar()).getByText('compass')).toBeInTheDocument();
    expect(within(sidebar()).getByText('AppServer')).toBeInTheDocument();
    expect(within(sidebar()).getByText('Other paths')).toBeInTheDocument();
    expect(rowNames()).toEqual([
      '/development/compass/AppServer/Port',
      '/development/compass/AppServer/Title',
      '/development/compass/Flag'
    ]);
    expect(within(table()).getByText('Key')).toBeInTheDocument();
    expect(within(envTabs()).getByText('development')).toBeInTheDocument();
    expect(within(envTabs()).getByText('staging')).toBeInTheDocument();
    expect(
      screen.getByPlaceholderText(
        'Search keys in every service and environment'
      )
    ).toBeInTheDocument();
  });

  it('keeps the service and folder when the environment tab changes', async () => {
    const user = userEvent.setup();
    renderApp();
    await screen.findByText('Port');

    await user.click(within(sidebar()).getByText('AppServer'));
    expect(rowNames()).toHaveLength(2);
    await user.click(within(envTabs()).getByText('staging'));
    expect(rowNames()).toEqual(['/staging/compass/AppServer/Port']);
    expect(getLocation()).toEqual({
      view: 'services',
      service: 'compass',
      env: 'staging',
      folder: 'AppServer/'
    });
  });

  it('lists the names that do not fit under Other paths', async () => {
    const user = userEvent.setup();
    renderApp();
    await screen.findByText('Port');

    await user.click(within(sidebar()).getByText('Other paths'));
    expect(rowNames()).toEqual(['/random/Thing']);
    expect(
      screen.getByText("Don't match /{environment}/{service}/…")
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('radiogroup', { name: 'Environment' })
    ).not.toBeInTheDocument();
  });

  it('moves through the current rows with ↑/↓', async () => {
    const user = userEvent.setup();
    renderApp();
    await screen.findByText('Port');

    await user.click(within(table()).getByText('Flag'));
    fireEvent.keyDown(window, { key: 'ArrowUp' });
    expect(useUiStore.getState().selectedName).toBe(
      '/development/compass/AppServer/Title'
    );
  });

  it('switches to the Paths view at the same place', async () => {
    const user = userEvent.setup();
    renderApp();
    await screen.findByText('Port');

    await user.click(within(sidebar()).getByText('AppServer'));
    await user.click(within(viewSwitcher()).getByText('Paths'));
    expect(getLocation()).toEqual({
      view: 'paths',
      scope: '/development/compass/AppServer/'
    });
    expect(rowNames()).toHaveLength(2);
    expect(
      screen.queryByRole('radiogroup', { name: 'Environment' })
    ).not.toBeInTheDocument();
  });

  it('counts matches in the sidebar while searching', async () => {
    const user = userEvent.setup();
    renderApp();
    await screen.findByText('Port');

    await user.type(screen.getByLabelText('Search parameters'), 'Thing');
    expect(within(sidebar()).queryByText('compass')).not.toBeInTheDocument();
    expect(within(sidebar()).getByText('Other paths')).toBeInTheDocument();
  });

  it('starts a new parameter in the selected folder', async () => {
    const user = userEvent.setup();
    renderApp();
    await screen.findByText('Port');

    await user.click(within(sidebar()).getByText('AppServer'));
    await user.click(screen.getByRole('button', { name: /New parameter/ }));
    await user.type(screen.getByLabelText('Parameter name'), 'Timeout');
    expect(
      screen.getByText('/development/compass/AppServer/Timeout')
    ).toBeInTheDocument();
  });

  it('opens the parameter in another environment from its chip', async () => {
    const user = userEvent.setup();
    renderApp();
    await screen.findByText('Port');
    const openStaging = () =>
      user.click(
        within(
          screen.getByRole('complementary', { name: 'Details' })
        ).getByRole('button', {
          name: 'staging'
        })
      );

    await user.click(within(table()).getByText('Port'));
    await openStaging();
    expect(useUiStore.getState().selectedName).toBe(
      '/staging/compass/AppServer/Port'
    );
    expect(getLocation()).toEqual({
      view: 'services',
      service: 'compass',
      env: 'staging',
      folder: ''
    });
    expect(rowNames()).toEqual(['/staging/compass/AppServer/Port']);

    await user.click(within(envTabs()).getByText('development'));
    await user.click(within(table()).getByText('Port'));
    await user.click(within(viewSwitcher()).getByText('Paths'));
    await user.click(within(sidebar()).getByText('AppServer'));
    await openStaging();
    expect(getLocation()).toEqual({
      view: 'paths',
      scope: '/staging/compass/AppServer/'
    });
    expect(rowNames()).toEqual(['/staging/compass/AppServer/Port']);
  });

  it('shows the Paths view only, without the switcher, while the switch is off', async () => {
    renderApp({ structure: { ...structure, enabled: false } });
    await screen.findAllByText('Port');
    expect(
      screen.queryByRole('radiogroup', { name: 'View' })
    ).not.toBeInTheDocument();
    expect(within(sidebar()).getByText('development')).toBeInTheDocument();
    expect(rowNames()).toHaveLength(parameters.length);
  });
});
