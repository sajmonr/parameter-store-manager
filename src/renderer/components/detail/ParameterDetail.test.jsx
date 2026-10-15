// @vitest-environment jsdom
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import * as api from '../../clients/api';
import { uiActions, useUiStore } from '../../state/ui';
import { renderWithProviders } from '../../test/render';
import { createTestState, makeParameter } from '../../test/testState';
import DetailHost from './DetailHost';

vi.mock('../../clients/api', () => import('../../test/mockApi'));

const secret = makeParameter('/dev/app/Password', {
  Type: 'SecureString',
  KeyId: 'alias/aws/ssm',
  Description: 'Login',
  Version: 3
});

const setup = () => {
  const queryClient = createTestState({ parameters: [secret] });
  uiActions.selectParameter(secret.Name);
  return renderWithProviders(<DetailHost narrow={false} />, { queryClient });
};

beforeEach(() => vi.clearAllMocks());

describe('ParameterDetail', () => {
  it('shows the parameter with its value masked', async () => {
    const user = userEvent.setup();
    setup();
    expect(screen.getByText('Password')).toBeInTheDocument();
    expect(screen.getByText('SecureString')).toBeInTheDocument();
    expect(screen.getByText('alias/aws/ssm')).toBeInTheDocument();
    expect(screen.getByText('••••••••')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /Reveal/ }));
    expect(screen.getByText('value of /dev/app/Password')).toBeInTheDocument();
  });

  it('saves an edit as a new version', async () => {
    const user = userEvent.setup();
    api.putParameter.mockResolvedValue({ version: 4 });
    setup();

    await user.click(screen.getByRole('button', { name: /Edit/ }));
    expect(screen.getByText(/Saves as version 4/)).toBeInTheDocument();
    const value = screen.getByRole('textbox', { name: 'Value' });
    await user.clear(value);
    await user.type(value, 'new secret');
    await user.click(screen.getByRole('button', { name: 'Save' }));

    expect(api.putParameter).toHaveBeenCalledWith({
      name: '/dev/app/Password',
      type: 'SecureString',
      kmsKey: 'alias/aws/ssm',
      value: 'new secret',
      description: 'Login',
      overwrite: true
    });
    expect(await screen.findByText('Password · version 4')).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Save' })
    ).not.toBeInTheDocument();
  });

  it('leaves edit mode on Esc before closing the pane', async () => {
    const user = userEvent.setup();
    setup();
    await user.click(screen.getByRole('button', { name: /Edit/ }));

    fireEvent.keyDown(window, { key: 'Escape' });
    expect(
      screen.queryByRole('button', { name: 'Save' })
    ).not.toBeInTheDocument();
    expect(useUiStore.getState().paneMode).toBe('detail');

    fireEvent.keyDown(window, { key: 'Escape' });
    expect(useUiStore.getState().paneMode).toBe(null);
  });

  it('deletes after confirmation and closes the pane', async () => {
    const user = userEvent.setup();
    api.deleteParameter.mockResolvedValue({ name: secret.Name });
    setup();

    await user.click(screen.getByRole('button', { name: /Delete/ }));
    expect(screen.getByText('Delete this parameter?')).toBeInTheDocument();
    const confirm = screen
      .getAllByRole('button', { name: /Delete/ })
      .find(button => button.closest('.ant-popconfirm'));
    await user.click(confirm);

    await waitFor(() => expect(useUiStore.getState().paneMode).toBe(null));
    expect(api.deleteParameter).toHaveBeenCalledWith('/dev/app/Password');
    expect(await screen.findByText('Parameter deleted')).toBeInTheDocument();
  });

  it('opens a prefilled form on Duplicate', async () => {
    const user = userEvent.setup();
    setup();
    await user.click(screen.getByRole('button', { name: /Duplicate/ }));
    expect(useUiStore.getState().newPrefill).toEqual({
      folder: '/dev/app/',
      name: 'PasswordCopy',
      description: 'Login',
      type: 'SecureString',
      kmsKey: 'alias/aws/ssm',
      value: 'value of /dev/app/Password'
    });
    expect(screen.getByText('Duplicate parameter')).toBeInTheDocument();
  });
});
