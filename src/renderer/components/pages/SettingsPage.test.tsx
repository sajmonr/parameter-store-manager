// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import * as api from '../../test/mockServices';
import type { Settings } from '../../../shared/availableSettings';
import { useExportStore } from '../../state/export';
import { useSettingsStore } from '../../state/settings';
import { uiActions, useUiStore } from '../../state/ui';
import type { SettingsSection } from '../../state/ui';
import { renderWithProviders } from '../../test/render';
import { createTestState, makeParameter } from '../../test/testState';
import ParameterBrowser from '../parameters/ParameterBrowser';
import SettingsPage from './SettingsPage';

vi.mock('../../services', () => import('../../test/mockServices'));

// The browser loads the parameters of the current profile and region.
const setup = (
  settings: Partial<Settings> = {},
  section: SettingsSection = 'aws'
) => {
  const queryClient = createTestState({
    parameters: [makeParameter('/a/b')],
    settings
  });
  uiActions.openSettings(section);
  return renderWithProviders(
    <>
      <ParameterBrowser />
      <SettingsPage />
    </>,
    { queryClient }
  );
};

const ui = () => useUiStore.getState();

// The region lists are long and only partly rendered, so a searchable select
// is narrowed down to the option first.
const pickOption = async (
  user: ReturnType<typeof userEvent.setup>,
  field: string,
  option: string,
  { search = false } = {}
) => {
  const select = screen.getByRole('combobox', { name: field });
  await user.click(select);
  if (search) await user.type(select, option);
  await user.click(
    (await screen.findAllByText(option)).find(el =>
      el.closest('.ant-select-item-option')
    )!
  );
};

const delimiterInput = () =>
  screen.getByRole('textbox', { name: /Path delimiter/ });

beforeEach(() => {
  vi.clearAllMocks();
  api.profilesService.list.mockResolvedValue({
    profiles: [
      { name: 'default', source: 'config' },
      { name: 'dev', source: 'credentials' }
    ],
    envProfile: null
  });
  api.parametersService.describe.mockReturnValue(new Promise(() => {}));
});

describe('SettingsPage', () => {
  it('shows one section at a time and switches from the menu', async () => {
    const user = userEvent.setup();
    setup();

    expect(
      screen.getByRole('combobox', { name: 'Profile' })
    ).toBeInTheDocument();
    expect(screen.getByText('Changes are saved automatically.')).toBeVisible();

    await user.click(screen.getByRole('menuitem', { name: /Display/ }));
    expect(ui().settingsSection).toBe('display');
    expect(delimiterInput()).toBeInTheDocument();
    expect(screen.queryByRole('combobox', { name: 'Profile' })).toBeNull();
  });
});

describe('AWS connection', () => {
  it('saves the profile right away and reloads parameters', async () => {
    const user = userEvent.setup();
    setup({ profile: '' });
    uiActions.setScope('/a/');
    uiActions.selectParameter('/a/b');

    expect(await screen.findByText('from ~/.aws/config')).toBeInTheDocument();
    await pickOption(user, 'Profile', 'dev');

    expect(api.settingsService.set).toHaveBeenCalledWith({ profile: 'dev' });
    await waitFor(() =>
      expect(api.parametersService.describe).toHaveBeenCalled()
    );
    expect(ui().paneMode).toBeNull();
    expect(ui().scope).toBe('');
  });

  it('saves the KMS region with the SSM region while it follows it', async () => {
    const user = userEvent.setup();
    setup({ ssmRegion: 'us-east-1', kmsRegion: 'us-east-1' });

    expect(
      screen.getByRole('checkbox', { name: 'KMS region same as SSM' })
    ).toBeChecked();
    expect(screen.getByRole('combobox', { name: 'KMS region' })).toBeDisabled();
    await pickOption(user, 'SSM region', 'us-west-2', { search: true });

    expect(api.settingsService.set).toHaveBeenCalledWith({
      ssmRegion: 'us-west-2',
      kmsRegion: 'us-west-2'
    });
    await waitFor(() =>
      expect(api.parametersService.describe).toHaveBeenCalled()
    );
  });

  it('keeps the box unchecked and the KMS region apart once unchecked', async () => {
    const user = userEvent.setup();
    setup({ ssmRegion: 'us-east-1', kmsRegion: 'us-east-1' });
    const box = screen.getByRole('checkbox', {
      name: 'KMS region same as SSM'
    });

    await user.click(box);
    expect(box).not.toBeChecked();
    expect(api.settingsService.set).not.toHaveBeenCalled();

    await pickOption(user, 'SSM region', 'us-west-2', { search: true });
    expect(api.settingsService.set).toHaveBeenCalledWith({
      ssmRegion: 'us-west-2'
    });
    await waitFor(() =>
      expect(useSettingsStore.getState().ssmRegion).toBe('us-west-2')
    );
    expect(box).not.toBeChecked();
  });

  it('copies the SSM region to KMS when the box is checked', async () => {
    const user = userEvent.setup();
    setup({ ssmRegion: 'us-east-1', kmsRegion: 'eu-west-1' });
    const box = screen.getByRole('checkbox', {
      name: 'KMS region same as SSM'
    });

    expect(box).not.toBeChecked();
    await user.click(box);
    expect(api.settingsService.set).toHaveBeenCalledWith({
      kmsRegion: 'us-east-1'
    });
  });

  it('keeps the box unchecked after visiting another section', async () => {
    const user = userEvent.setup();
    setup({ ssmRegion: 'us-east-1', kmsRegion: 'us-east-1' });

    await user.click(
      screen.getByRole('checkbox', { name: 'KMS region same as SSM' })
    );
    await user.click(screen.getByRole('menuitem', { name: /Display/ }));
    await user.click(screen.getByRole('menuitem', { name: /AWS connection/ }));
    expect(
      screen.getByRole('checkbox', { name: 'KMS region same as SSM' })
    ).not.toBeChecked();

    await pickOption(user, 'SSM region', 'us-west-2', { search: true });
    expect(api.settingsService.set).toHaveBeenCalledWith({
      ssmRegion: 'us-west-2'
    });
  });

  it('leaves the box unchecked when copying the region fails', async () => {
    const user = userEvent.setup();
    api.settingsService.set.mockRejectedValueOnce(new Error('Disk full'));
    setup({ ssmRegion: 'us-east-1', kmsRegion: 'eu-west-1' });
    const box = screen.getByRole('checkbox', {
      name: 'KMS region same as SSM'
    });

    await user.click(box);
    expect(await screen.findByText('Disk full')).toBeInTheDocument();
    expect(box).not.toBeChecked();
    expect(
      screen.getByRole('combobox', { name: 'KMS region' })
    ).not.toBeDisabled();
  });

  it('lists the named default profile apart from AWS_PROFILE', async () => {
    const user = userEvent.setup();
    api.profilesService.list.mockResolvedValue({
      profiles: [
        { name: 'default', source: 'config' },
        { name: 'dev', source: 'credentials' }
      ],
      envProfile: 'dev'
    });
    setup({ profile: '' });

    expect(await screen.findByText('AWS_PROFILE=dev')).toBeInTheDocument();
    await pickOption(user, 'Profile', 'default');
    expect(api.settingsService.set).toHaveBeenCalledWith({
      profile: 'default'
    });
  });

  it('warns that changing the source stops a running export', async () => {
    setup();
    expect(screen.queryByText('An export is running')).toBeNull();

    act(() => useExportStore.setState({ running: true }));
    expect(await screen.findByText('An export is running')).toBeVisible();
  });
});

describe('Display', () => {
  it('saves the delimiter on Enter, not while typing, and collapses the tree', async () => {
    const user = userEvent.setup();
    setup({}, 'display');
    uiActions.setScope('/a/');
    uiActions.setExpandedFolders(['/a/']);

    await user.clear(delimiterInput());
    await user.type(delimiterInput(), '.');
    expect(api.settingsService.set).not.toHaveBeenCalled();

    await user.keyboard('{Enter}');
    expect(api.settingsService.set).toHaveBeenCalledWith({
      pathDelimiter: '.'
    });
    await waitFor(() => expect(ui().expandedFolders).toEqual([]));
    expect(ui().scope).toBe('');
  });

  it('saves the delimiter on blur', async () => {
    const user = userEvent.setup();
    setup({}, 'display');

    await user.clear(delimiterInput());
    await user.type(delimiterInput(), ':');
    await user.tab();
    expect(api.settingsService.set).toHaveBeenCalledWith({
      pathDelimiter: ':'
    });
  });

  it("shows an error and doesn't save an invalid delimiter", async () => {
    const user = userEvent.setup();
    setup({}, 'display');

    await user.clear(delimiterInput());
    await user.keyboard('{Enter}');
    expect(await screen.findByText('Enter a delimiter.')).toBeInTheDocument();

    await user.type(delimiterInput(), ' ');
    await user.tab();
    expect(
      await screen.findByText("The delimiter can't contain spaces.")
    ).toBeInTheDocument();
    expect(api.settingsService.set).not.toHaveBeenCalled();
    expect(useSettingsStore.getState().pathDelimiter).toBe('/');
  });

  it('shows a delimiter the main process rejects as an error', async () => {
    const user = userEvent.setup();
    api.settingsService.set.mockRejectedValueOnce(
      new Error('"dev-eu" contains "-".')
    );
    setup({}, 'display');

    await user.clear(delimiterInput());
    await user.type(delimiterInput(), '-{Enter}');
    expect(
      await screen.findByText('"dev-eu" contains "-".')
    ).toBeInTheDocument();
    expect(delimiterInput()).toHaveValue('-');
  });

  it('puts the saved delimiter back on Esc', async () => {
    const user = userEvent.setup();
    setup({}, 'display');

    await user.clear(delimiterInput());
    await user.keyboard('{Escape}');
    expect(delimiterInput()).toHaveValue('/');
    expect(screen.queryByText('Enter a delimiter.')).toBeNull();

    await user.tab();
    expect(api.settingsService.set).not.toHaveBeenCalled();
  });

  it('saves the theme on change', async () => {
    const user = userEvent.setup();
    setup({}, 'display');

    await user.click(screen.getByText('Dark'));
    expect(api.settingsService.set).toHaveBeenCalledWith({ theme: 'dark' });
  });
});
