// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import * as api from '../test/mockServices';
import { uiActions, useUiStore } from '../state/ui';
import { renderWithProviders } from '../test/render';
import { NARROW_QUERY } from '../utils/layout';
import { makeParameter } from '../test/testState';
import AppShell from './AppShell';

vi.mock('../services', () => import('../test/mockServices'));

const parameters = [
  makeParameter('/dev/app/db/Password', {
    Type: 'SecureString',
    KeyId: 'alias/aws/ssm'
  }),
  makeParameter('/dev/app/db/Host'),
  makeParameter('/dev/app/Title'),
  makeParameter('/prd/app/Title')
];

const renderApp = () => renderWithProviders(<AppShell />);
const awsError = (name: string) => Object.assign(new Error('nope'), { name });
const table = () => document.querySelector<HTMLElement>('.ant-table')!;

beforeEach(() => {
  vi.clearAllMocks();
  api.serveParameters(parameters);
});

describe('AppShell', () => {
  it('loads parameters into the table and the folder tree', async () => {
    renderApp();
    expect(screen.getByLabelText('Loading parameters')).toBeInTheDocument();

    expect(await screen.findByText('Password')).toBeInTheDocument();
    expect(screen.getByText('4 of 4 parameters')).toBeInTheDocument();
    // The footer says when they were loaded; it isn't a button.
    expect(screen.getByText(/^Synced/)).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /Synced/ })
    ).not.toBeInTheDocument();
    const tree = screen.getByRole('tree');
    expect(within(tree).getByText('dev')).toBeInTheDocument();
    expect(within(tree).getByText('prd')).toBeInTheDocument();
  });

  it('shows a spinner instead of the count until all pages are loaded', async () => {
    let lastPage!: (page: { parameters: typeof parameters }) => void;
    api.parametersService.describe
      .mockResolvedValueOnce({
        parameters: [parameters[0]!],
        nextToken: 'next'
      })
      .mockReturnValueOnce(
        new Promise(resolve => {
          lastPage = resolve;
        })
      );
    renderApp();

    expect(await screen.findByText('Password')).toBeInTheDocument();
    expect(screen.getByLabelText('Counting parameters')).toBeInTheDocument();
    // The count's badge; the rail has its own.
    const countBadge = () =>
      [...document.querySelectorAll('.ant-badge')].find(
        badge => !badge.closest('nav[aria-label="Pages"]')
      ) ?? null;
    expect(countBadge()).not.toBeInTheDocument();

    lastPage({ parameters: parameters.slice(1) });
    await waitFor(() =>
      expect(
        screen.queryByLabelText('Counting parameters')
      ).not.toBeInTheDocument()
    );
    expect(countBadge()).toHaveTextContent('4');
  });

  it('filters by search and scope together', async () => {
    const user = userEvent.setup();
    renderApp();
    await screen.findByText('Password');

    await user.type(screen.getByLabelText('Search parameters'), 'title');
    expect(screen.getByText('2 of 4 parameters')).toBeInTheDocument();

    await user.click(within(screen.getByRole('tree')).getByText('prd'));
    expect(screen.getByText('1 of 4 parameters')).toBeInTheDocument();
    expect(screen.getByText('/prd')).toBeInTheDocument();
  });

  it('shows the glob tag for glob queries', async () => {
    const user = userEvent.setup();
    renderApp();
    await screen.findByText('Password');

    await user.type(screen.getByLabelText('Search parameters'), '**/Title');
    expect(screen.getByText('glob')).toBeInTheDocument();
    expect(screen.getByText('2 of 4 parameters')).toBeInTheDocument();
  });

  it('offers to clear a search without results', async () => {
    const user = userEvent.setup();
    renderApp();
    await screen.findByText('Password');

    await user.type(screen.getByLabelText('Search parameters'), 'missing');
    expect(screen.getByText(/No parameters match/)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Clear search' }));
    expect(screen.getByText('4 of 4 parameters')).toBeInTheDocument();
  });

  it('masks SecureString values until revealed', async () => {
    const user = userEvent.setup();
    renderApp();
    await screen.findByText('Password');

    const row = within(table())
      .getByText('Password')
      .closest<HTMLElement>('.ant-table-row')!;
    expect(within(row).getByText('••••••••')).toBeInTheDocument();
    await user.click(within(row).getByRole('button', { name: 'Reveal' }));
    expect(
      within(row).getByText('value of /dev/app/db/Password')
    ).toBeInTheDocument();
  });

  it('opens the detail pane on row click and closes it with Esc', async () => {
    const user = userEvent.setup();
    renderApp();
    await screen.findByText('Password');

    await user.click(within(table()).getByText('Host'));
    const pane = await screen.findByRole('complementary', { name: 'Details' });
    expect(within(pane).getByText('/dev/app/db/Host')).toBeInTheDocument();

    fireEvent.keyDown(window, { key: 'ArrowDown' });
    expect(
      within(screen.getByRole('complementary', { name: 'Details' })).getByText(
        '/dev/app/db/Password'
      )
    ).toBeInTheDocument();

    fireEvent.keyDown(window, { key: 'Escape' });
    expect(
      screen.queryByRole('complementary', { name: 'Details' })
    ).not.toBeInTheDocument();
  });

  it('shows the expired-session screen', async () => {
    api.parametersService.describe.mockRejectedValue(
      awsError('ExpiredTokenException')
    );
    renderApp();
    expect(await screen.findByText('AWS session expired')).toBeInTheDocument();
    expect(screen.getByText('aws sso login')).toBeInTheDocument();
    expect(screen.getByText('Last sync failed')).toBeInTheDocument();
  });

  it('shows the access-denied screen and retries', async () => {
    const user = userEvent.setup();
    api.parametersService.describe.mockRejectedValue(
      awsError('AccessDeniedException')
    );
    renderApp();
    expect(await screen.findByText('Access denied')).toBeInTheDocument();

    api.serveParameters(parameters);
    await user.click(screen.getByRole('button', { name: 'Retry' }));
    expect(await screen.findByText('Password')).toBeInTheDocument();
  });

  it('shows the empty-account screen', async () => {
    api.serveParameters([]);
    renderApp();
    expect(
      await screen.findByText('No parameters in us-east-1')
    ).toBeInTheDocument();
    await waitFor(() =>
      expect(screen.getByText('No folders')).toBeInTheDocument()
    );
  });
});

describe('pages', () => {
  const rail = () => screen.getByRole('navigation', { name: 'Pages' });
  const railButton = (name: string) =>
    within(rail()).getByRole('button', { name });
  const page = () => useUiStore.getState().page;

  it('shows the three pages in the rail and highlights the current one', async () => {
    const user = userEvent.setup();
    renderApp();
    await screen.findByText('Password');

    expect(
      within(rail())
        .getAllByRole('button')
        .map(button => button.getAttribute('aria-label'))
    ).toEqual(['Parameters', 'Import & export', 'Settings']);
    expect(railButton('Parameters')).toHaveAttribute('aria-current', 'page');

    await user.click(railButton('Import & export'));
    expect(page()).toBe('importExport');
    expect(railButton('Import & export')).toHaveAttribute(
      'aria-current',
      'page'
    );
    expect(railButton('Parameters')).not.toHaveAttribute('aria-current');
    // The hidden Parameters page is out of the accessibility tree.
    expect(
      screen.queryByRole('button', { name: /New parameter/ })
    ).not.toBeInTheDocument();
  });

  it('keeps the selection, search and a New parameter draft across pages', async () => {
    const user = userEvent.setup();
    renderApp();
    await screen.findByText('Password');

    await user.type(screen.getByLabelText('Search parameters'), 'app');
    await user.click(within(table()).getByText('Host'));
    expect(
      await screen.findByRole('complementary', { name: 'Details' })
    ).toBeInTheDocument();

    await user.click(railButton('Import & export'));
    await user.click(railButton('Parameters'));
    expect(screen.getByLabelText('Search parameters')).toHaveValue('app');
    expect(
      within(screen.getByRole('complementary', { name: 'Details' })).getByText(
        '/dev/app/db/Host'
      )
    ).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /New parameter/ }));
    const name = await screen.findByLabelText('Parameter name');
    await user.type(name, 'Draft');
    await user.click(railButton('Import & export'));
    await user.click(railButton('Parameters'));
    expect(screen.getByLabelText('Parameter name')).toHaveValue('Draft');
  });

  it('keeps the drawer inside the Parameters page in a narrow window', async () => {
    const matchMedia = window.matchMedia;
    window.matchMedia = query =>
      ({
        ...matchMedia(query),
        matches: query === NARROW_QUERY
      }) as MediaQueryList;
    try {
      const user = userEvent.setup();
      renderApp();
      await screen.findByText('Password');

      await user.click(screen.getByRole('button', { name: /New parameter/ }));
      const name = await screen.findByLabelText('Parameter name');
      await user.type(name, 'Draft');
      // It renders inside the pages, so its mask doesn't cover the rail.
      const drawer = name.closest('.ant-drawer')!;
      expect(drawer.closest('main')).not.toBeNull();
      expect(rail().contains(drawer)).toBe(false);

      await user.click(railButton('Import & export'));
      fireEvent.keyDown(window, { key: 'Escape' });
      expect(useUiStore.getState().paneMode).toBe('new');
      await user.click(railButton('Parameters'));
      expect(await screen.findByLabelText('Parameter name')).toHaveValue(
        'Draft'
      );
    } finally {
      window.matchMedia = matchMedia;
    }
  });

  it('ignores Esc and ↑/↓ for the Parameters page while it is hidden', async () => {
    const user = userEvent.setup();
    renderApp();
    await screen.findByText('Password');
    await user.click(within(table()).getByText('Host'));
    await screen.findByRole('complementary', { name: 'Details' });

    await user.click(railButton('Import & export'));
    fireEvent.keyDown(window, { key: 'ArrowDown' });
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(useUiStore.getState().selectedName).toBe('/dev/app/db/Host');

    await user.click(railButton('Parameters'));
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(useUiStore.getState().selectedName).toBeNull();
  });

  it('opens Settings from the rail, Cmd/Ctrl+, and the app menu', async () => {
    const user = userEvent.setup();
    renderApp();
    await screen.findByText('Password');

    await user.click(railButton('Settings'));
    expect(page()).toBe('settings');

    uiActions.showPage('parameters');
    fireEvent.keyDown(window, { key: ',', ctrlKey: true });
    expect(page()).toBe('settings');

    uiActions.showPage('parameters');
    const fromMenu = api.menuService.onOpenSettings.mock.calls[0]![0];
    fromMenu();
    expect(page()).toBe('settings');
  });

  it('keeps exporting on another page, showing it in the rail', async () => {
    const user = userEvent.setup();
    api.filesService.save.mockResolvedValue('/Downloads/export.csv');
    renderApp();
    await screen.findByText('Password');
    let lastPage!: (page: { parameters: typeof parameters }) => void;
    api.parametersService.describe.mockReturnValueOnce(
      new Promise(resolve => {
        lastPage = resolve;
      })
    );

    await user.click(railButton('Import & export'));
    await user.click(
      screen.getByRole('button', { name: /^Export .* as CSV$/ })
    );
    await user.click(railButton('Parameters'));
    // It fades out, but stops showing at once.
    const busyDot = () =>
      rail().querySelector('.ant-badge-dot[data-show="true"]');
    expect(busyDot()).toBeInTheDocument();
    // The dot coming and going doesn't take keyboard focus away.
    railButton('Import & export').focus();

    lastPage({ parameters });
    expect(
      await screen.findByText('Saved export.csv (4 parameters)')
    ).toBeInTheDocument();
    expect(page()).toBe('parameters');
    expect(busyDot()).not.toBeInTheDocument();
    expect(railButton('Import & export')).toHaveFocus();
  });
});
