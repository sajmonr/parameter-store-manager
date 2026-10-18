// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import * as api from '../test/mockServices';
import { renderWithProviders } from '../test/render';
import { makeParameter } from '../test/testState';
import AppShell, { siderMaxWidth } from './AppShell';

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
    expect(document.querySelector('.ant-badge')).not.toBeInTheDocument();

    lastPage({ parameters: parameters.slice(1) });
    await waitFor(() =>
      expect(
        screen.queryByLabelText('Counting parameters')
      ).not.toBeInTheDocument()
    );
    expect(document.querySelector('.ant-badge')).toHaveTextContent('4');
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

describe('siderMaxWidth', () => {
  it('leaves room for the table next to the pane', () => {
    expect(siderMaxWidth(1280, false)).toBe(480);
    expect(siderMaxWidth(1100, false)).toBe(300);
  });

  it('ignores the pane when it is a drawer, up to 600px', () => {
    expect(siderMaxWidth(960, true)).toBe(600);
    expect(siderMaxWidth(700, true)).toBe(340);
  });

  it('never goes below the minimum width', () => {
    expect(siderMaxWidth(900, false)).toBe(180);
  });
});
