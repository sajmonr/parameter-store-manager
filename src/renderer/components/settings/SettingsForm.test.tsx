// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import * as api from '../../test/mockServices';
import type { Settings } from '../../../shared/availableSettings';
import { uiActions } from '../../state/ui';
import { renderWithProviders } from '../../test/render';
import { createTestState, makeParameter } from '../../test/testState';
import ParameterBrowser from '../parameters/ParameterBrowser';
import SettingsModal from './SettingsModal';

vi.mock('../../services', () => import('../../test/mockServices'));

// The browser loads the parameters of the current profile and region.
const setup = (settings: Partial<Settings>) => {
  const queryClient = createTestState({
    parameters: [makeParameter('/a/b')],
    settings
  });
  uiActions.openSettings();
  return renderWithProviders(
    <>
      <ParameterBrowser />
      <SettingsModal />
    </>,
    { queryClient }
  );
};

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

describe('SettingsForm', () => {
  it('saves the settings, with the KMS region following SSM', async () => {
    const user = userEvent.setup();
    setup({ ssmRegion: 'us-east-1', kmsRegion: 'us-east-1' });

    expect(
      screen.getByRole('checkbox', { name: 'KMS region same as SSM' })
    ).toBeChecked();
    await user.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => expect(api.settingsService.set).toHaveBeenCalled());
    expect(api.settingsService.set).toHaveBeenCalledWith({
      profile: '',
      ssmRegion: 'us-east-1',
      kmsRegion: 'us-east-1',
      pathDelimiter: '/',
      theme: 'system'
    });
    expect(await screen.findByText('Settings saved')).toBeInTheDocument();
    // Nothing that affects loading changed, so nothing reloads.
    expect(api.parametersService.describe).not.toHaveBeenCalled();
  });

  it('keeps a different KMS region when the box is unchecked', async () => {
    const user = userEvent.setup();
    setup({ ssmRegion: 'us-east-1', kmsRegion: 'eu-west-1' });

    expect(
      screen.getByRole('checkbox', { name: 'KMS region same as SSM' })
    ).not.toBeChecked();
    await user.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() =>
      expect(api.settingsService.set).toHaveBeenCalledWith(
        expect.objectContaining({ kmsRegion: 'eu-west-1' })
      )
    );
  });

  it('reloads parameters when the profile changes', async () => {
    const user = userEvent.setup();
    setup({ profile: '' });

    expect(await screen.findByText('from ~/.aws/config')).toBeInTheDocument();
    await user.click(screen.getByRole('combobox', { name: 'Profile' }));
    await user.click(
      (await screen.findAllByText('dev')).find(el =>
        el.closest('.ant-select-item-option')
      )!
    );
    await user.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() =>
      expect(api.settingsService.set).toHaveBeenCalledWith(
        expect.objectContaining({ profile: 'dev' })
      )
    );
    await waitFor(() =>
      expect(api.parametersService.describe).toHaveBeenCalled()
    );
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
    await user.click(screen.getByRole('combobox', { name: 'Profile' }));
    await user.click(
      (await screen.findAllByText('default')).find(el =>
        el.closest('.ant-select-item-option')
      )!
    );
    await user.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() =>
      expect(api.settingsService.set).toHaveBeenCalledWith(
        expect.objectContaining({ profile: 'default' })
      )
    );
  });
});
