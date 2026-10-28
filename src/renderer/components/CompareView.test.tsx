// @vitest-environment jsdom
import { beforeEach, describe, expect, it, onTestFinished, vi } from 'vitest';
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

const startComparing = async (loaded = 'Port') => {
  const user = userEvent.setup();
  renderApp();
  await screen.findByText(loaded);
  await user.click(within(modeSwitch()).getByText('Compare'));
  // The columns show first; the rows once everything has loaded.
  await within(
    await screen.findByRole('table', { name: 'Compare environments' })
  ).findAllByRole('rowheader');
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

  it('synchronizes keys that differ or are missing from their first environment', async () => {
    const user = await startComparing();
    const syncButton = (key: string) =>
      within(rowOf(key)).queryByRole('button', {
        name: 'Synchronize environments'
      });

    // One per key, next to its tags; none where every value is the same.
    expect(syncButton('Flag')).toBeInTheDocument();
    expect(syncButton('Secret')).toBeInTheDocument();
    expect(syncButton('Port')).not.toBeInTheDocument();

    await user.click(syncButton('Flag')!);
    const dialog = await screen.findByRole('dialog');
    expect(dialog).toHaveTextContent('Synchronize environments');
    expect(dialog).toHaveTextContent('/development/compass/Flag');
    expect(
      within(dialog).getByRole('combobox', { name: 'Source environment' })
    ).toBeInTheDocument();
    expect(dialog).toHaveTextContent(
      'Choose which environment to copy the value from.'
    );
    expect(useUiStore.getState().selectedName).toBeNull();
  });

  it('copies each value to the clipboard', async () => {
    await startComparing();
    // Every value has its own button, including where they're all the same.
    expect(
      within(rowOf('Port')).getAllByRole('button', { name: 'Copy' })
    ).toHaveLength(3);
    expect(
      within(rowOf('Secret')).getAllByRole('button', { name: 'Copy' })
    ).toHaveLength(2);
  });

  it('sets a missing value by copying it from another environment', async () => {
    const user = await startComparing();
    api.parametersService.put.mockResolvedValue({ version: 1 });

    await user.click(
      within(rowOf('Secret')).getByRole('button', { name: /Not set/ })
    );
    const menu = await screen.findByRole('menu');
    expect(menu).toHaveTextContent('Set value in production');
    expect(menu).toHaveTextContent('/production/compass/Secret');
    expect(menu).toHaveTextContent('Set in development, staging');

    await user.click(
      within(menu).getByRole('menuitem', {
        name: /Copy from another environment/
      })
    );
    const dialog = await screen.findByRole('dialog');
    expect(dialog).toHaveTextContent('/development/compass/Secret');
    expect(dialog).toHaveTextContent(
      'Choose which environment to copy the value from.'
    );
    expect(
      within(dialog).getByRole('checkbox', { name: 'production' })
    ).toBeChecked();
    expect(useUiStore.getState().selectedName).toBeNull();

    await user.click(
      within(dialog).getByRole('button', { name: 'Copy to 1 environment' })
    );
    expect(api.parametersService.put).toHaveBeenCalledWith({
      name: '/production/compass/Secret',
      type: 'SecureString',
      kmsKey: 'alias/aws/ssm',
      value: 'dev-secret',
      overwrite: false
    });
    await waitFor(() =>
      expect(
        within(rowOf('Secret')).queryByRole('button', { name: /Not set/ })
      ).not.toBeInTheDocument()
    );
    expect(grid()).toBeInTheDocument();
  });

  it('closes the Not set menu on Esc', async () => {
    const user = await startComparing();
    act(() => uiActions.selectParameter('/development/compass/Flag'));
    await user.click(
      within(rowOf('Secret')).getByRole('button', { name: /Not set/ })
    );
    await screen.findByRole('menu');

    await user.keyboard('{Escape}');
    // The menu took the Esc, so the pane stays open.
    expect(useUiStore.getState().selectedName).toBe(
      '/development/compass/Flag'
    );
    // The menu is closed, so the next Esc closes the pane.
    await user.keyboard('{Escape}');
    await waitFor(() => expect(useUiStore.getState().selectedName).toBeNull());
  });

  it('sets a missing value in the new-parameter form, staying in compare mode', async () => {
    const user = await startComparing();
    api.parametersService.put.mockResolvedValue({ version: 1 });

    await user.click(
      within(rowOf('Secret')).getByRole('button', { name: /Not set/ })
    );
    await user.click(
      await screen.findByRole('menuitem', { name: /Enter a new value/ })
    );

    const pane = await screen.findByRole('complementary', { name: 'Details' });
    expect(within(pane).getByText('New parameter')).toBeInTheDocument();
    expect(within(pane).getByTitle('compass')).toBeInTheDocument();
    expect(
      within(pane).getByRole('checkbox', { name: 'production' })
    ).toBeChecked();
    expect(
      within(pane).getByRole('checkbox', { name: 'development' })
    ).not.toBeChecked();
    expect(within(pane).getByRole('combobox', { name: 'Key' })).toHaveValue(
      'Secret'
    );
    expect(pane).toHaveTextContent('/production/compass/Secret');
    expect(pane).not.toHaveTextContent('Already exists');
    const value = within(pane).getByRole('textbox', { name: 'Value' });
    expect(value).toHaveValue('');
    expect(value).toHaveFocus();

    await user.type(value, 'prod-secret');
    await user.click(
      within(pane).getByRole('button', { name: 'Create parameter' })
    );
    expect(api.parametersService.put).toHaveBeenCalledWith({
      name: '/production/compass/Secret',
      description: '',
      type: 'SecureString',
      kmsKey: 'alias/aws/ssm',
      value: 'prod-secret',
      overwrite: false
    });
    await waitFor(() =>
      expect(useUiStore.getState().selectedName).toBe(
        '/production/compass/Secret'
      )
    );
    expect(grid()).toBeInTheDocument();
    expect(
      within(rowOf('Secret')).queryByRole('button', { name: /Not set/ })
    ).not.toBeInTheDocument();
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

  it('opens a value from the keyboard', async () => {
    const user = await startComparing();

    const cell = within(rowOf('Flag'))
      .getByText('off')
      .closest<HTMLElement>('[role="cell"]')!;
    act(() => cell.focus());
    await user.keyboard('{Enter}');
    expect(useUiStore.getState().selectedName).toBe('/production/compass/Flag');

    // The reveal button inside a cell only reveals.
    act(() => uiActions.closePane());
    const reveal = within(rowOf('Secret')).getAllByLabelText('Reveal')[0]!;
    act(() => reveal.focus());
    await user.keyboard('{Enter}');
    expect(useUiStore.getState().selectedName).toBeNull();
    expect(useUiStore.getState().revealed.size).toBe(1);
  });

  it("doesn't claim equal values when some weren't compared", async () => {
    api.serveParameters([
      makeParameter('/development/compass/Secret', {
        Value: 'a',
        Type: 'SecureString'
      }),
      makeParameter('/staging/compass/Secret', {
        Value: undefined,
        Type: 'SecureString'
      }),
      makeParameter('/production/compass/Secret', {
        Value: 'a',
        Type: 'SecureString'
      })
    ]);
    const user = await startComparing('Secret');

    expect(
      within(rowOf('Secret')).getByText("Can't decrypt")
    ).toBeInTheDocument();
    await user.click(within(filter()).getByText('Differs'));
    expect(
      screen.getByText(
        "No differences in the values that loaded. 1 key couldn't be compared."
      )
    ).toBeInTheDocument();
  });

  it('masks revealed values again in another profile or region', async () => {
    await startComparing();

    act(() => uiActions.toggleReveal('/development/compass/Secret'));
    await act(() => saveSettingsAndApply({ ssmRegion: 'eu-west-1' }));
    expect(useUiStore.getState().revealed.size).toBe(0);
  });

  it('goes back to the table when grouping is turned off', async () => {
    await startComparing();

    await act(() =>
      saveSettingsAndApply({ structure: { ...structure, enabled: false } })
    );
    expect(useUiStore.getState().compare).toBe(false);
  });
});

// A promise the test resolves when it lets a request finish.
const gate = () => {
  let open = () => {};
  const opened = new Promise<void>(resolve => {
    open = resolve;
  });
  return { open, opened };
};

// Holds the value requests until the returned gate opens.
const holdValues = () => {
  const values = gate();
  const serve = api.parametersService.getValues.getMockImplementation()!;
  api.parametersService.getValues.mockImplementation(async names => {
    await values.opened;
    return serve(names);
  });
  return values;
};

// The grid's placeholder rows during the first load.
const placeholders = () => grid().querySelectorAll('.ant-skeleton').length;

describe('Compare mode while loading', () => {
  it('waits for the first load, then shows the comparison', async () => {
    const values = holdValues();
    const user = userEvent.setup();
    renderApp();
    await screen.findByText('Port');
    await user.click(within(modeSwitch()).getByText('Compare'));

    // The columns show straight away; the rows wait.
    expect(
      within(grid())
        .getAllByRole('columnheader')
        .map(header => header.textContent)
    ).toEqual(['Key', 'development–', 'staging–', 'production–']);
    expect(within(grid()).queryAllByRole('rowheader')).toHaveLength(0);
    expect(placeholders()).toBeGreaterThan(0);
    // No counts from names still arriving.
    expect(within(filter()).getAllByText('–')).toHaveLength(3);
    expect(within(filter()).queryByText('3')).toBeNull();
    await user.click(within(filter()).getByText('Missing'));
    expect(placeholders()).toBeGreaterThan(0);

    await act(async () => values.open());
    await waitFor(() => expect(keyNames()).toEqual(['Secret']));
    expect(placeholders()).toBe(0);
  });

  it('says how far a slow load has got', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    onTestFinished(() => {
      vi.useRealTimers();
    });
    // Two pages: the second waits, then the values do.
    const [first, second] = [parameters.slice(0, 4), parameters.slice(4)];
    const page = gate();
    api.parametersService.describe.mockImplementation(async nextToken => {
      if (!nextToken) {
        return {
          parameters: first.map(api.metadataOf),
          nextToken: 'page-2'
        };
      }
      await page.opened;
      return { parameters: second.map(api.metadataOf) };
    });
    const values = holdValues();
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    renderApp();
    await screen.findByText('Flag');
    await user.click(within(modeSwitch()).getByText('Compare'));

    expect(screen.queryByText(/Loading parameters…/)).toBeNull();
    act(() => vi.advanceTimersByTime(3000));
    expect(screen.getByText('Loading parameters… 4 found')).toBeInTheDocument();

    await act(async () => page.open());
    expect(
      await screen.findByText('Loading values… 0% (0 of 10)')
    ).toBeInTheDocument();

    await act(async () => values.open());
    await waitFor(() => expect(placeholders()).toBe(0));
    expect(screen.queryByText(/Loading values…/)).toBeNull();
  });

  it("doesn't compare a first load that failed partway", async () => {
    // The first page loads; the second fails once, while comparing, then
    // works.
    const [first, second] = [parameters.slice(0, 4), parameters.slice(4)];
    const page = gate();
    let failSecond = true;
    api.parametersService.describe.mockImplementation(async nextToken => {
      if (!nextToken) {
        return { parameters: first.map(api.metadataOf), nextToken: 'page-2' };
      }
      if (failSecond) {
        failSecond = false;
        await page.opened;
        throw new Error('Throttled');
      }
      return { parameters: second.map(api.metadataOf) };
    });
    const user = userEvent.setup();
    renderApp();
    await screen.findByText('Flag');
    await user.click(within(modeSwitch()).getByText('Compare'));
    await act(async () => page.open());

    expect(
      await screen.findByText("Couldn't load every parameter")
    ).toBeInTheDocument();
    expect(within(grid()).queryAllByRole('rowheader')).toHaveLength(0);
    expect(placeholders()).toBe(0);
    expect(within(filter()).getAllByText('–')).toHaveLength(3);
    // Showing the failure doesn't start another load by itself.
    expect(api.parametersService.describe).toHaveBeenCalledTimes(2);

    await user.click(screen.getByRole('button', { name: 'Retry' }));
    await waitFor(() => expect(keyNames()).toEqual(['Flag', 'Secret', 'Port']));
    expect(screen.queryByText("Couldn't load every parameter")).toBeNull();
  });

  it('keeps the comparison on screen during a refresh', async () => {
    const user = userEvent.setup();
    const { queryClient } = renderApp();
    await screen.findByText('Port');
    await user.click(within(modeSwitch()).getByText('Compare'));
    await screen.findByRole('table', { name: 'Compare environments' });

    holdValues();
    act(() => {
      void queryClient.refetchQueries();
    });
    await waitFor(() =>
      expect(api.parametersService.getValues).toHaveBeenCalledTimes(2)
    );
    expect(placeholders()).toBe(0);
    expect(within(rowOf('Flag')).getByText('Differs')).toBeInTheDocument();
  });
});
