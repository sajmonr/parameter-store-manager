// @vitest-environment jsdom
import { beforeEach, describe, expect, it, onTestFinished, vi } from 'vitest';
import { act, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DEFAULT_STRUCTURE } from '../../shared/structure';
import type { Structure } from '../../shared/structure';
import * as api from '../test/mockServices';
import { getLocation, uiActions, useUiStore } from '../state/ui';
import { renderWithProviders } from '../test/render';
import { createTestState, makeParameter } from '../test/testState';
import AppShell from './AppShell';

vi.mock('../services', () => import('../test/mockServices'));

const structure: Structure = {
  ...DEFAULT_STRUCTURE,
  enabled: true,
  services: [
    { segment: 'compass', environments: ['development', 'staging'] },
    { segment: 'billing', environments: ['development', 'production'] }
  ]
};

const parameters = [
  makeParameter('/development/billing/Key'),
  makeParameter('/development/compass/AppServer/Port'),
  makeParameter('/development/compass/Flag'),
  makeParameter('/staging/compass/AppServer/Port'),
  makeParameter('/random/Thing')
];

const renderApp = () =>
  renderWithProviders(<AppShell />, {
    queryClient: createTestState({
      settings: { structure, defaultView: 'environments' }
    })
  });

const table = () => document.querySelector<HTMLElement>('.ant-table')!;
const sidebar = () => document.querySelector<HTMLElement>('.ant-layout-sider')!;
const breadcrumb = () =>
  document.querySelector<HTMLElement>('.ant-breadcrumb')!;
const rowKeys = () =>
  [...table().querySelectorAll('.ant-table-row[data-row-key]')].map(row =>
    row.getAttribute('data-row-key')
  );
const viewSwitcher = () => screen.getByLabelText('View');

beforeEach(() => {
  vi.clearAllMocks();
  api.serveParameters(parameters);
});

const keys = (service: string) =>
  Array.from(
    { length: 150 },
    (_, i) => `/development/${service}/Key${String(i).padStart(3, '0')}`
  );

describe('Environments view', () => {
  it('scrolls the selected row into view after switching views', async () => {
    // jsdom has no layout and measures everything as 0; the virtual table
    // scrolls by the row and viewport heights.
    const sizes = {
      offsetHeight: [56, '.ant-table-row'],
      clientHeight: [561, '.ant-table-tbody-virtual-holder']
    } as const;
    Object.entries(sizes).forEach(([property, [size, selector]]) => {
      Object.defineProperty(HTMLElement.prototype, property, {
        configurable: true,
        get(this: HTMLElement) {
          return this.matches(selector) ? size : 0;
        }
      });
    });
    onTestFinished(() =>
      Object.keys(sizes).forEach(property => {
        delete (HTMLElement.prototype as unknown as Record<string, unknown>)[
          property
        ];
      })
    );
    const user = userEvent.setup();
    api.serveParameters(
      [...keys('compass'), ...keys('billing')].map(name => makeParameter(name))
    );
    renderApp();
    await screen.findAllByText('Key000');

    // Near the end of the whole environment, near the top of its service.
    const name = '/development/billing/Key005';
    act(() => uiActions.selectParameter(name));
    await waitFor(() => expect(rowKeys()).toContain(name));

    await user.click(within(viewSwitcher()).getByText('Services'));
    expect(getLocation()).toMatchObject({
      view: 'services',
      service: 'billing'
    });
    await waitFor(() => expect(rowKeys()).toContain(name));
  });

  it('shows a whole environment grouped by service, in the configured order', async () => {
    renderApp();
    await screen.findByText('Port');

    // The view switcher and the group title.
    expect(within(sidebar()).getAllByText('Environments')).toHaveLength(2);
    expect(within(sidebar()).getByText('development')).toBeInTheDocument();
    expect(within(sidebar()).getByText('Other paths')).toBeInTheDocument();
    expect(rowKeys()).toEqual([
      JSON.stringify(['group', 'compass']),
      '/development/compass/AppServer/Port',
      '/development/compass/Flag',
      JSON.stringify(['group', 'billing']),
      '/development/billing/Key'
    ]);
    expect(
      within(table()).getByRole('columnheader', { name: 'Key' })
    ).toBeInTheDocument();
    expect(screen.queryByLabelText('Environment')).not.toBeInTheDocument();
  });

  it('narrows to a service when its group header is clicked', async () => {
    const user = userEvent.setup();
    renderApp();
    await screen.findByText('Port');

    await user.click(within(table()).getByText('billing'));
    expect(getLocation()).toEqual({
      view: 'environments',
      env: 'development',
      service: 'billing',
      folder: ''
    });
    expect(rowKeys()).toEqual(['/development/billing/Key']);
    expect(within(breadcrumb()).getByText('development')).toBeInTheDocument();
    expect(within(breadcrumb()).getByText('billing')).toBeInTheDocument();
  });

  it('shows a service folder with a breadcrumb back to the environment', async () => {
    const user = userEvent.setup();
    renderApp();
    await screen.findByText('Port');

    act(() =>
      uiActions.setLocation({
        view: 'environments',
        env: 'development',
        service: 'compass',
        folder: 'AppServer/'
      })
    );
    expect(rowKeys()).toEqual(['/development/compass/AppServer/Port']);
    expect(within(breadcrumb()).getByText('AppServer')).toBeInTheDocument();

    await user.click(within(breadcrumb()).getByText('development'));
    expect(getLocation()).toEqual({
      view: 'environments',
      env: 'development',
      service: null,
      folder: ''
    });
  });

  it('keeps the selected parameter when switching views', async () => {
    const user = userEvent.setup();
    renderApp();
    await screen.findByText('Port');

    await user.click(within(table()).getByText('Flag'));
    for (const view of ['Services', 'Paths', 'Environments']) {
      await user.click(within(viewSwitcher()).getByText(view));
      expect(useUiStore.getState().selectedName).toBe(
        '/development/compass/Flag'
      );
      expect(rowKeys()).toContain('/development/compass/Flag');
    }
    expect(getLocation()).toEqual({
      view: 'environments',
      env: 'development',
      service: 'compass',
      folder: ''
    });
  });

  it('opens the parameter in another environment from its chip', async () => {
    const user = userEvent.setup();
    renderApp();
    await screen.findByText('Port');

    await user.click(within(table()).getByText('Port'));
    await user.click(
      within(screen.getByLabelText('Details')).getByRole('button', {
        name: 'staging'
      })
    );
    expect(useUiStore.getState().selectedName).toBe(
      '/staging/compass/AppServer/Port'
    );
    expect(getLocation()).toEqual({
      view: 'environments',
      env: 'staging',
      service: null,
      folder: ''
    });
    expect(rowKeys()).toEqual([
      JSON.stringify(['group', 'compass']),
      '/staging/compass/AppServer/Port'
    ]);
  });
});
