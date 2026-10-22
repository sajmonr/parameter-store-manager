// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DEFAULT_STRUCTURE } from '../../shared/structure';
import type { Structure } from '../../shared/structure';
import type { Settings } from '../../shared/availableSettings';
import * as api from '../test/mockServices';
import { useUiStore } from '../state/ui';
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

const renderApp = (settings: Partial<Settings> = {}) =>
  renderWithProviders(<AppShell />, {
    queryClient: createTestState({ settings: { structure, ...settings } })
  });

const table = () => document.querySelector<HTMLElement>('.ant-table')!;
const sidebar = () => document.querySelector<HTMLElement>('.ant-layout-sider')!;
const rowNames = () =>
  [...table().querySelectorAll('.ant-table-row[data-row-key]')].map(row =>
    row.getAttribute('data-row-key')
  );
const rowCheckbox = (name: string) =>
  within(table()).getByRole('checkbox', { name: `Select ${name}` });
const headerCheckbox = () =>
  table().querySelector<HTMLInputElement>('thead input[type="checkbox"]')!;
const headerState = () => {
  const wrapper = headerCheckbox().closest('.ant-checkbox')!;
  if (wrapper.classList.contains('ant-checkbox-indeterminate')) return 'some';
  return headerCheckbox().checked ? 'all' : 'none';
};
const deleteButton = () => {
  const toolbar = screen.queryByRole('toolbar', { name: 'Selection' });
  return toolbar && within(toolbar).getByRole('button', { name: /Delete/ });
};
const checkedNames = () => [...useUiStore.getState().checked.names];

// Deletes what was asked, except the names in `fail`.
const serveDeletes = (fail: string[] = []) =>
  api.parametersService.delete.mockImplementation(async names => ({
    deleted: names.filter(name => !fail.includes(name)),
    invalid: names.filter(name => fail.includes(name))
  }));

beforeEach(() => {
  vi.clearAllMocks();
  api.serveParameters(parameters);
});

describe('checking rows', () => {
  it('checks a row without opening it; clicking the row opens it', async () => {
    const user = userEvent.setup();
    renderApp();
    await screen.findByText('Port');

    await user.click(rowCheckbox('/development/compass/Flag'));
    expect(checkedNames()).toEqual(['/development/compass/Flag']);
    expect(useUiStore.getState().paneMode).toBe(null);

    await user.click(within(table()).getByText('Flag'));
    expect(useUiStore.getState().selectedName).toBe(
      '/development/compass/Flag'
    );
    expect(checkedNames()).toEqual(['/development/compass/Flag']);
  });

  it('checks all rows shown from the header, or clears them', async () => {
    const user = userEvent.setup();
    renderApp();
    await screen.findByText('Port');
    expect(headerState()).toBe('none');
    expect(deleteButton()).not.toBeInTheDocument();

    await user.click(rowCheckbox('/development/compass/Flag'));
    expect(headerState()).toBe('some');
    expect(deleteButton()).toBeInTheDocument();
    expect(
      screen
        .getByRole('toolbar', { name: 'Selection' })
        .closest('.ant-badge')!
        .querySelector('.ant-badge-count')
    ).toHaveTextContent('1');

    await user.click(headerCheckbox());
    expect(headerState()).toBe('all');
    expect(checkedNames()).toHaveLength(3);

    await user.click(headerCheckbox());
    expect(headerState()).toBe('none');
    expect(deleteButton()).not.toBeInTheDocument();
  });

  it('clears the selection from the selection bar', async () => {
    const user = userEvent.setup();
    renderApp();
    await screen.findByText('Port');

    await user.click(headerCheckbox());
    await user.click(screen.getByRole('button', { name: 'Clear selection' }));
    expect(headerState()).toBe('none');
    expect(
      screen.queryByRole('toolbar', { name: 'Selection' })
    ).not.toBeInTheDocument();
  });

  it('unchecks everything when the folder, tab or search changes', async () => {
    const user = userEvent.setup();
    renderApp();
    await screen.findByText('Port');
    const envTabs = screen.getByRole('radiogroup', { name: 'Environment' });

    await user.click(headerCheckbox());
    await user.click(within(envTabs).getByText('staging'));
    expect(headerState()).toBe('none');
    // Coming back doesn't bring them back.
    await user.click(within(envTabs).getByText('development'));
    expect(headerState()).toBe('none');

    await user.click(headerCheckbox());
    await user.click(within(sidebar()).getByText('AppServer'));
    expect(headerState()).toBe('none');

    await user.click(headerCheckbox());
    await user.type(screen.getByLabelText('Search parameters'), 'Port');
    expect(headerState()).toBe('none');
  });
});

describe('deleting', () => {
  it('deletes the checked rows after confirming', async () => {
    const user = userEvent.setup();
    serveDeletes();
    renderApp();
    await screen.findByText('Port');

    await user.click(rowCheckbox('/development/compass/AppServer/Port'));
    await user.click(rowCheckbox('/development/compass/Flag'));
    await user.click(deleteButton()!);

    const dialog = await screen.findByRole('dialog');
    expect(dialog).toHaveTextContent('Delete 2 parameters?');
    expect(dialog).toHaveTextContent(
      "permanently deleted from us-east-1. This can't be undone."
    );
    expect(dialog).toHaveTextContent('/development/compass/AppServer/Port');
    expect(dialog).toHaveTextContent('/development/compass/Flag');
    await user.click(
      within(dialog).getByRole('button', { name: 'Delete 2 parameters' })
    );

    expect(await screen.findByText('Deleted 2 parameters')).toBeInTheDocument();
    expect(api.parametersService.delete).toHaveBeenCalledWith([
      '/development/compass/AppServer/Port',
      '/development/compass/Flag'
    ]);
    expect(rowNames()).toEqual(['/development/compass/AppServer/Title']);
    expect(checkedNames()).toEqual([]);
    expect(useUiStore.getState().pendingDelete).toBe(null);
  });

  it('keeps the names that failed checked and lists them', async () => {
    const user = userEvent.setup();
    serveDeletes(['/development/compass/Flag']);
    renderApp();
    await screen.findByText('Port');

    await user.click(headerCheckbox());
    await user.click(deleteButton()!);
    await user.click(
      within(await screen.findByRole('dialog')).getByRole('button', {
        name: 'Delete 3 parameters'
      })
    );

    expect(
      await screen.findByText(
        '1 parameter could not be deleted. They are still selected.'
      )
    ).toBeInTheDocument();
    expect(rowNames()).toEqual(['/development/compass/Flag']);
    expect(headerState()).toBe('all');
  });

  it('cancels without deleting', async () => {
    const user = userEvent.setup();
    renderApp();
    await screen.findByText('Port');

    await user.click(headerCheckbox());
    await user.click(deleteButton()!);
    const dialog = await screen.findByRole('dialog');
    await user.click(within(dialog).getByRole('button', { name: 'Cancel' }));

    expect(useUiStore.getState().pendingDelete).toBe(null);
    expect(api.parametersService.delete).not.toHaveBeenCalled();
    expect(checkedNames()).toHaveLength(3);
  });

  it('closes the pane when the open parameter is deleted', async () => {
    const user = userEvent.setup();
    serveDeletes();
    renderApp();
    await screen.findByText('Port');

    await user.click(within(table()).getByText('Flag'));
    await user.click(rowCheckbox('/development/compass/Flag'));
    await user.click(deleteButton()!);
    await user.click(
      within(await screen.findByRole('dialog')).getByRole('button', {
        name: 'Delete 1 parameter'
      })
    );

    await waitFor(() => expect(useUiStore.getState().paneMode).toBe(null));
    expect(useUiStore.getState().selectedName).toBe(null);
  });
});

describe('deleting a tree from the sidebar', () => {
  const openMenu = async (label: string) => {
    fireEvent.contextMenu(within(sidebar()).getByText(label));
    return screen.findByRole('menu');
  };

  it('deletes a service in the environment it shows only', async () => {
    const user = userEvent.setup();
    serveDeletes();
    renderApp();
    await screen.findByText('Port');

    const menu = await openMenu('compass');
    expect(menu).toHaveTextContent('/development/compass/');
    const item = within(menu).getByRole('menuitem', { name: /Delete tree/ });
    expect(item).toHaveTextContent('Delete tree…3');
    await user.click(item);

    const dialog = await screen.findByRole('dialog');
    expect(dialog).toHaveTextContent(
      'Delete /development/compass/ and everything in it?'
    );
    expect(dialog).not.toHaveTextContent('/staging/');
    await user.click(
      within(dialog).getByRole('button', { name: 'Delete 3 parameters' })
    );

    expect(await screen.findByText('Deleted 3 parameters')).toBeInTheDocument();
    // The staging key is left, and the sidebar count follows.
    const envTabs = screen.getByRole('radiogroup', { name: 'Environment' });
    await user.click(within(envTabs).getByText('staging'));
    expect(rowNames()).toEqual(['/staging/compass/AppServer/Port']);
  });

  it('counts every loaded parameter, not only the matches', async () => {
    const user = userEvent.setup();
    renderApp();
    await screen.findByText('Port');
    await user.type(screen.getByLabelText('Search parameters'), 'Title');

    const menu = await openMenu('AppServer');
    expect(
      within(menu).getByRole('menuitem', { name: /Delete tree/ })
    ).toHaveTextContent('Delete tree…2');
  });

  it('deletes a folder in the Paths tree while grouping is off', async () => {
    const user = userEvent.setup();
    serveDeletes();
    renderApp({ structure: { ...structure, enabled: false } });
    await screen.findAllByText('Port');

    const menu = await openMenu('development');
    expect(menu).toHaveTextContent('/development/');
    await user.click(
      within(menu).getByRole('menuitem', { name: /Delete tree/ })
    );
    await user.click(
      within(await screen.findByRole('dialog')).getByRole('button', {
        name: 'Delete 3 parameters'
      })
    );

    expect(await screen.findByText('Deleted 3 parameters')).toBeInTheDocument();
    // The menu doesn't go to the folder.
    expect(useUiStore.getState().location).toBe(null);
    expect(rowNames()).toEqual([
      '/production/billing/Key',
      '/random/Thing',
      '/staging/compass/AppServer/Port'
    ]);
  });

  it('checks rows and deletes them in the Paths tree while grouping is off', async () => {
    const user = userEvent.setup();
    serveDeletes();
    renderApp({ structure: { ...structure, enabled: false } });
    await screen.findAllByText('Port');

    await user.click(rowCheckbox('/random/Thing'));
    expect(headerState()).toBe('some');
    await user.click(deleteButton()!);
    await user.click(
      within(await screen.findByRole('dialog')).getByRole('button', {
        name: 'Delete 1 parameter'
      })
    );
    expect(await screen.findByText('Deleted 1 parameter')).toBeInTheDocument();
    expect(rowNames()).not.toContain('/random/Thing');
  });
});

describe('the Environments view', () => {
  const renderEnvironments = () => renderApp({ defaultView: 'environments' });

  it('gives the service group rows no checkbox and leaves them out of Select all', async () => {
    const user = userEvent.setup();
    renderEnvironments();
    await screen.findByText('Port');

    const group = table().querySelector(
      `.ant-table-row[data-row-key='${JSON.stringify(['group', 'compass'])}']`
    )!;
    expect(group.querySelector('input[type="checkbox"]')).toBe(null);

    await user.click(headerCheckbox());
    expect(headerState()).toBe('all');
    expect(checkedNames().sort()).toEqual([
      '/development/compass/AppServer/Port',
      '/development/compass/AppServer/Title',
      '/development/compass/Flag'
    ]);
  });

  it('deletes an environment, or a service in it, from the sidebar', async () => {
    renderEnvironments();
    await screen.findByText('Port');
    const menuFor = async (label: string, path: string) => {
      fireEvent.contextMenu(within(sidebar()).getAllByText(label)[0]!);
      const menus = await screen.findAllByRole('menu');
      return menus.find(menu => menu.textContent?.startsWith(path));
    };

    expect(await menuFor('development', '/development/')).toHaveTextContent(
      'Delete tree…3'
    );
    expect(await menuFor('compass', '/development/compass/')).toHaveTextContent(
      'Delete tree…3'
    );
  });
});
