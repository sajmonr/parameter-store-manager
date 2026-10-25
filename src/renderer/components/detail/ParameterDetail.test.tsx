// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  act,
  fireEvent,
  renderHook,
  screen,
  waitFor,
  within
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DEFAULT_STRUCTURE } from '../../../shared/structure';
import type { Structure } from '../../../shared/structure';
import * as api from '../../test/mockServices';
import { useDeleteParameters, usePutParameter } from '../../state/parameters';
import { uiActions, useUiStore } from '../../state/ui';
import { createWrapper, renderWithProviders } from '../../test/render';
import { createTestState, makeParameter } from '../../test/testState';
import DeleteModal from '../delete/DeleteModal';
import DetailHost from './DetailHost';

vi.mock('../../services', () => import('../../test/mockServices'));

const secret = makeParameter('/dev/app/Password', {
  Type: 'SecureString',
  KeyId: 'alias/aws/ssm',
  Description: 'Login',
  Version: 3
});

const setup = () => {
  const queryClient = createTestState({ parameters: [secret] });
  uiActions.selectParameter(secret.Name);
  return renderWithProviders(
    <>
      <DetailHost narrow={false} />
      <DeleteModal />
    </>,
    { queryClient }
  );
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
    api.parametersService.put.mockResolvedValue({ version: 4 });
    setup();

    await user.click(screen.getByRole('button', { name: /Edit/ }));
    expect(screen.getByText(/Saves as version 4/)).toBeInTheDocument();
    const value = screen.getByRole('textbox', { name: 'Value' });
    await user.clear(value);
    await user.type(value, 'new secret');
    await user.click(screen.getByRole('button', { name: 'Save' }));

    expect(api.parametersService.put).toHaveBeenCalledWith({
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
    api.parametersService.delete.mockResolvedValue({
      deleted: [secret.Name],
      invalid: []
    });
    setup();

    await user.click(screen.getByRole('button', { name: /Delete/ }));
    const dialog = await screen.findByRole('dialog');
    expect(dialog).toHaveTextContent('Delete Password?');
    expect(dialog).toHaveTextContent('/dev/app/Password');
    // Names only, never values.
    expect(dialog).not.toHaveTextContent('value of');
    await user.click(
      within(dialog).getByRole('button', { name: 'Delete 1 parameter' })
    );

    await waitFor(() => expect(useUiStore.getState().paneMode).toBe(null));
    expect(api.parametersService.delete).toHaveBeenCalledWith([
      '/dev/app/Password'
    ]);
    expect(await screen.findByText('Deleted 1 parameter')).toBeInTheDocument();
  });

  it('cancels the confirmation on Esc without closing the pane', async () => {
    const user = userEvent.setup();
    setup();
    await user.click(screen.getByRole('button', { name: /Delete/ }));
    await screen.findByRole('dialog');

    fireEvent.keyDown(window, { key: 'Escape' });
    expect(useUiStore.getState().pendingDelete).toBe(null);
    expect(useUiStore.getState().paneMode).toBe('detail');
    expect(api.parametersService.delete).not.toHaveBeenCalled();
  });

  it('opens a prefilled form on Duplicate', async () => {
    const user = userEvent.setup();
    setup();
    await user.click(screen.getByRole('button', { name: /Duplicate/ }));
    expect(useUiStore.getState().newPrefill).toEqual({
      source: '/dev/app/Password',
      description: 'Login',
      type: 'SecureString',
      kmsKey: 'alias/aws/ssm',
      value: 'value of /dev/app/Password'
    });
    expect(screen.getByText('Duplicate parameter')).toBeInTheDocument();
  });
});

describe('ParameterDetail with the structure', () => {
  const structure: Structure = {
    ...DEFAULT_STRUCTURE,
    enabled: true,
    services: [
      {
        segment: 'compass',
        environments: ['development', 'staging', 'production']
      }
    ]
  };
  const devPort = makeParameter('/development/compass/AppServer/Port');
  const stagingPort = makeParameter('/staging/compass/AppServer/Port');
  const other = makeParameter('/random/Thing');

  const setupWith = (
    name: string,
    settings: { structure: Structure } = { structure }
  ) => {
    const queryClient = createTestState({
      parameters: [devPort, stagingPort, other],
      settings
    });
    uiActions.selectParameter(name);
    return renderWithProviders(<DetailHost narrow={false} />, { queryClient });
  };

  const environmentsRow = () =>
    screen.getByText('Environments').closest('tr') as HTMLElement;

  it('shows the service, environment and folder of a matched parameter', () => {
    setupWith(devPort.Name);
    expect(screen.getByText('compass')).toBeInTheDocument();
    expect(
      within(screen.getByRole('complementary')).getAllByText('development')
    ).toHaveLength(2);
    expect(screen.getByText('AppServer/')).toBeInTheDocument();
    expect(screen.getByText('Port')).toBeInTheDocument();
    expect(screen.queryByText(/Other paths/)).not.toBeInTheDocument();
  });

  it('shows a chip per environment of the service', () => {
    setupWith(devPort.Name);
    const row = within(environmentsRow());
    expect(row.getByText('development')).toHaveAttribute(
      'aria-current',
      'true'
    );
    expect(row.getByRole('button', { name: 'staging' })).toBeInTheDocument();
    expect(row.getByText('production · missing')).toBeInTheDocument();
    expect(row.getAllByRole('button')).toHaveLength(1);
  });

  it('selects the parameter in another environment', async () => {
    const user = userEvent.setup();
    setupWith(devPort.Name);
    await user.click(
      within(environmentsRow()).getByRole('button', { name: 'staging' })
    );
    expect(useUiStore.getState().selectedName).toBe(stagingPort.Name);
    expect(within(environmentsRow()).getByText('staging')).toHaveAttribute(
      'aria-current',
      'true'
    );
  });

  it('does nothing on a missing chip', async () => {
    const user = userEvent.setup();
    setupWith(devPort.Name);
    await user.click(
      within(environmentsRow()).getByText('production · missing')
    );
    expect(useUiStore.getState().selectedName).toBe(devPort.Name);
    expect(
      await screen.findByText('Not set in production')
    ).toBeInTheDocument();
  });

  it('updates the chips after a create or delete', async () => {
    api.parametersService.delete.mockResolvedValue({
      deleted: [stagingPort.Name],
      invalid: []
    });
    api.parametersService.put.mockResolvedValue({ version: 1 });
    const { queryClient } = setupWith(devPort.Name);
    const wrapper = createWrapper(queryClient);
    const { result: remove } = renderHook(() => useDeleteParameters(), {
      wrapper
    });
    const { result: put } = renderHook(() => usePutParameter(), { wrapper });

    await act(() => remove.current.mutateAsync([stagingPort.Name]));
    expect(
      await within(environmentsRow()).findByText('staging · missing')
    ).toBeInTheDocument();

    await act(() =>
      put.current.mutateAsync({
        name: '/production/compass/AppServer/Port',
        type: 'String',
        value: '80',
        overwrite: false
      })
    );
    expect(
      await within(environmentsRow()).findByRole('button', {
        name: 'production'
      })
    ).toBeInTheDocument();
  });

  it('explains why an unmatched parameter is under Other paths', () => {
    setupWith(other.Name);
    expect(
      screen.getByText(
        "This path doesn't match /{environment}/{service}/…, so it's listed under Other paths."
      )
    ).toBeInTheDocument();
    expect(screen.queryByText('Environments')).not.toBeInTheDocument();
    expect(screen.queryByText('compass')).not.toBeInTheDocument();
  });

  it('is unchanged with the switch off', () => {
    setupWith(devPort.Name, { structure: { ...structure, enabled: false } });
    expect(screen.getByText('Port')).toBeInTheDocument();
    expect(screen.queryByText('Environments')).not.toBeInTheDocument();
    expect(screen.queryByText('compass')).not.toBeInTheDocument();
    expect(screen.queryByText(/Other paths/)).not.toBeInTheDocument();
  });
});
