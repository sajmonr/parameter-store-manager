// @vitest-environment jsdom
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import * as api from '../../clients/api';
import { actions as uiActions } from '../../ducks/ui';
import { renderWithStore } from '../../test/render';
import { createTestStore, makeParameter } from '../../test/testStore';
import SettingsModal from './SettingsModal';

vi.mock('../../clients/api', () => import('../../test/mockApi'));

const setup = settings => {
  const store = createTestStore({
    parameters: [makeParameter('/a/b')],
    settings
  });
  store.dispatch(uiActions.openSettings());
  return renderWithStore(<SettingsModal />, { store });
};

beforeEach(() => {
  vi.clearAllMocks();
  api.listProfiles.mockResolvedValue([
    { name: 'default', source: 'config' },
    { name: 'dev', source: 'credentials' }
  ]);
  api.describeParameters.mockReturnValue(new Promise(() => {}));
});

describe('SettingsForm', () => {
  it('saves the settings, with the KMS region following SSM', async () => {
    const user = userEvent.setup();
    setup({ ssmRegion: 'us-east-1', kmsRegion: 'us-east-1' });

    expect(
      screen.getByRole('checkbox', { name: 'KMS region same as SSM' })
    ).toBeChecked();
    await user.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => expect(api.setSettings).toHaveBeenCalled());
    expect(api.setSettings).toHaveBeenCalledWith({
      profile: '',
      ssmRegion: 'us-east-1',
      kmsRegion: 'us-east-1',
      pathDelimiter: '/',
      theme: 'system'
    });
    expect(await screen.findByText('Settings saved')).toBeInTheDocument();
    // Nothing that affects loading changed, so nothing reloads.
    expect(api.describeParameters).not.toHaveBeenCalled();
  });

  it('keeps a different KMS region when the box is unchecked', async () => {
    const user = userEvent.setup();
    setup({ ssmRegion: 'us-east-1', kmsRegion: 'eu-west-1' });

    expect(
      screen.getByRole('checkbox', { name: 'KMS region same as SSM' })
    ).not.toBeChecked();
    await user.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() =>
      expect(api.setSettings).toHaveBeenCalledWith(
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
      )
    );
    await user.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() =>
      expect(api.setSettings).toHaveBeenCalledWith(
        expect.objectContaining({ profile: 'dev' })
      )
    );
    await waitFor(() => expect(api.describeParameters).toHaveBeenCalled());
  });
});
