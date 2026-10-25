// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DEFAULT_STRUCTURE } from '../../../shared/structure';
import type { Structure } from '../../../shared/structure';
import * as api from '../../test/mockServices';
import { getLocation, uiActions, useUiStore } from '../../state/ui';
import type { NewParameterPrefill } from '../../state/ui';
import type { Location } from '../../utils/location';
import { renderWithProviders } from '../../test/render';
import { createTestState, makeParameter } from '../../test/testState';
import ParameterForm from './ParameterForm';

vi.mock('../../services', () => import('../../test/mockServices'));

const structure: Structure = {
  ...DEFAULT_STRUCTURE,
  enabled: true,
  services: [
    { segment: 'compass', environments: ['development', 'staging'] },
    { segment: 'billing', environments: ['production'] }
  ]
};

const parameters = [
  makeParameter('/dev/app/Existing'),
  makeParameter('/development/compass/AppServer/Workers/Max'),
  makeParameter('/development/compass/AppServer/Port'),
  makeParameter('/staging/compass/AppServer/Port'),
  makeParameter('/production/billing/Key')
];

interface SetupOptions {
  prefill?: NewParameterPrefill | null;
  location?: Location;
  grouped?: boolean;
}

const setup = ({
  prefill = null,
  location = { view: 'paths', scope: '/dev/app/' },
  grouped = false
}: SetupOptions = {}) => {
  const queryClient = createTestState({
    parameters,
    settings: { structure: { ...structure, enabled: grouped } }
  });
  uiActions.setLocation(location);
  uiActions.openNewParameter(prefill);
  return renderWithProviders(<ParameterForm prefill={prefill} />, {
    queryClient
  });
};

const atService: SetupOptions = {
  grouped: true,
  location: {
    view: 'services',
    service: 'compass',
    env: 'development',
    folder: 'AppServer/'
  }
};

const primaryButton = () =>
  document.querySelector<HTMLButtonElement>('button[type="submit"]')!;
const keyField = () => screen.getByRole('combobox', { name: 'Key' });
const pathField = () => screen.getByRole('combobox', { name: 'Path' });
const valueField = () => screen.getByRole('textbox', { name: 'Value' });
const previewPaths = () =>
  [...document.querySelectorAll('li')].map(li =>
    li
      .querySelector('div > .ant-typography')!
      .textContent!.replace(/\u200b/g, '')
  );
const options = () =>
  screen.queryAllByRole('option').map(option => option.textContent);

beforeEach(() => {
  vi.clearAllMocks();
  api.parametersService.put.mockResolvedValue({ version: 1 });
});

describe('ParameterForm in path mode', () => {
  it('starts in the folder and previews the path', async () => {
    const user = userEvent.setup();
    setup();
    expect(screen.getByText('New parameter')).toBeInTheDocument();
    expect(pathField()).toHaveValue('/dev/app/');
    expect(primaryButton()).toBeDisabled();

    await user.type(pathField(), 'Cache/Ttl');
    expect(previewPaths()).toEqual(['/dev/app/Cache/Ttl']);
    expect(screen.getByText(/Creates new folder/)).toHaveTextContent(
      'Creates new folder Cache/'
    );
    expect(screen.queryByText('Use service and environment')).toBeNull();
  });

  it('starts at the root with a placeholder', () => {
    setup({ location: { view: 'paths', scope: '' } });
    expect(pathField()).toHaveValue('/');
    expect(pathField()).toHaveAttribute(
      'placeholder',
      '/development/compass/AppServer/Workers/MaxConcurrency'
    );
  });

  it('shows a trailing delimiter as an error only after leaving the field', async () => {
    const user = userEvent.setup();
    setup();
    expect(pathField()).not.toHaveFocus();
    expect(screen.queryByText('Add a name after the last /.')).toBeNull();
    await user.click(pathField());
    expect(screen.queryByText('Add a name after the last /.')).toBeNull();
    await user.type(valueField(), 'v');
    expect(
      screen.getByText('Add a name after the last /.')
    ).toBeInTheDocument();
    expect(primaryButton()).toBeDisabled();
  });

  it('rejects characters SSM does not allow', async () => {
    const user = userEvent.setup();
    setup();
    await user.type(pathField(), 'Key#');
    expect(
      screen.getByText('Use letters, digits, _ . - and / only.')
    ).toBeInTheDocument();
  });

  it('marks a path that already exists and opens it', async () => {
    const user = userEvent.setup();
    setup();
    await user.type(pathField(), 'Existing');
    await user.type(valueField(), 'v');
    expect(primaryButton()).toBeDisabled();
    expect(
      screen.getByText('This name already exists. Open it to edit instead.')
    ).toBeInTheDocument();
    expect(screen.getByText('Already exists')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Open →' }));
    expect(useUiStore.getState().selectedName).toBe('/dev/app/Existing');
  });

  it('creates the parameter and selects it', async () => {
    const user = userEvent.setup();
    setup();
    await user.type(pathField(), 'Timeout');
    await user.type(valueField(), '30');
    await user.click(screen.getByRole('button', { name: 'Create parameter' }));

    await waitFor(() =>
      expect(useUiStore.getState().selectedName).toBe('/dev/app/Timeout')
    );
    expect(api.parametersService.put).toHaveBeenCalledWith(
      expect.objectContaining({
        name: '/dev/app/Timeout',
        type: 'String',
        value: '30',
        overwrite: false
      })
    );
    expect(await screen.findByText('Parameter created')).toBeInTheDocument();
  });

  it('creates with ⌘/Ctrl+Enter, and Enter adds no newline', async () => {
    const user = userEvent.setup();
    setup();
    await user.type(pathField(), 'Timeout{Enter}');
    expect(pathField()).toHaveValue('/dev/app/Timeout');
    await user.type(valueField(), '30');
    fireEvent.keyDown(valueField(), { key: 'Enter', ctrlKey: true });
    await waitFor(() => expect(api.parametersService.put).toHaveBeenCalled());
  });

  it('shows how a path is grouped with grouping on', async () => {
    const user = userEvent.setup();
    setup({ grouped: true, location: { view: 'paths', scope: '' } });
    await user.type(pathField(), 'development/compass/Port');
    expect(screen.getByText('compass · development')).toBeInTheDocument();
    await user.clear(pathField());
    await user.type(pathField(), '/random/Port');
    expect(screen.getByText('Other paths')).toBeInTheDocument();
  });
});

describe('ParameterForm in structured mode', () => {
  it('starts at the service, environment and folder', () => {
    setup(atService);
    expect(
      screen.getByRole('combobox', { name: 'Service' })
    ).toBeInTheDocument();
    expect(screen.getByTitle('compass')).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: 'development' })).toBeChecked();
    expect(screen.getByRole('checkbox', { name: 'staging' })).not.toBeChecked();
    expect(keyField()).toHaveValue('AppServer/');
    expect(keyField()).not.toHaveFocus();
    expect(options()).toEqual([]);
    expect(keyField()).not.toHaveAttribute('placeholder');
    expect(screen.getByText('under /development/compass/')).toBeInTheDocument();
  });

  it('creates the key in several environments', async () => {
    const user = userEvent.setup();
    setup(atService);
    await user.click(screen.getByText('Select all'));
    expect(
      screen.getByText('under /{environment}/compass/')
    ).toBeInTheDocument();
    await user.type(keyField(), 'Timeout');
    await user.type(valueField(), '30');
    expect(previewPaths()).toEqual([
      '/development/compass/AppServer/Timeout',
      '/staging/compass/AppServer/Timeout'
    ]);
    expect(screen.getByText('Creates 2 parameters')).toBeInTheDocument();
    expect(
      screen.getByText('The same value is created in each environment.')
    ).toBeInTheDocument();

    await user.click(
      screen.getByRole('button', { name: 'Create in 2 environments' })
    );
    await waitFor(() =>
      expect(useUiStore.getState().selectedName).toBe(
        '/development/compass/AppServer/Timeout'
      )
    );
    expect(api.parametersService.put).toHaveBeenCalledTimes(2);
    expect(
      await screen.findByText('Created in 2 environments')
    ).toBeInTheDocument();
  });

  it('needs at least one environment', async () => {
    const user = userEvent.setup();
    setup(atService);
    await user.click(screen.getByRole('checkbox', { name: 'development' }));
    expect(
      screen.getByText('Pick at least one environment.')
    ).toBeInTheDocument();
  });

  it('names the environments where the key exists', async () => {
    const user = userEvent.setup();
    setup(atService);
    await user.click(screen.getByText('Select all'));
    await user.type(keyField(), 'Port');
    expect(
      screen.getByText(
        'Already exists in development, staging. Deselect them or change the key.'
      )
    ).toBeInTheDocument();
    expect(screen.getAllByText('Already exists')).toHaveLength(2);
  });

  it('rejects a leading delimiter', async () => {
    const user = userEvent.setup();
    setup(atService);
    await user.clear(keyField());
    await user.type(keyField(), '/Port');
    expect(
      screen.getByText(
        'The key starts after the service. Remove the leading /.'
      )
    ).toBeInTheDocument();
  });

  it('completes folders from the keyboard and drills down', async () => {
    const user = userEvent.setup();
    setup(atService);
    await user.click(keyField());
    expect(options()).toEqual(['AppServer/Workers/']);
    await user.keyboard('{Tab}');
    expect(keyField()).toHaveValue('AppServer/Workers/');
    expect(keyField()).toHaveFocus();
    expect(options()).toEqual([]);

    await user.clear(keyField());
    expect(options()).toEqual(['AppServer/']);
    await user.keyboard('{Escape}');
    expect(options()).toEqual([]);
    expect(useUiStore.getState().paneMode).toBe('new');
    await user.type(keyField(), 'A');
    await user.keyboard('{Enter}');
    expect(keyField()).toHaveValue('AppServer/');
  });

  it('completes a folder with the mouse', async () => {
    const user = userEvent.setup();
    setup(atService);
    await user.click(keyField());
    await user.click(screen.getByRole('option'));
    expect(keyField()).toHaveValue('AppServer/Workers/');
    expect(keyField()).toHaveFocus();
  });

  it('switches to a custom path and back', async () => {
    const user = userEvent.setup();
    setup(atService);
    await user.type(keyField(), 'Port2');
    await user.click(screen.getByText('Use a custom path'));
    expect(pathField()).toHaveValue('/development/compass/AppServer/Port2');

    await user.clear(pathField());
    await user.type(pathField(), '/production/billing/Db/Host');
    await user.click(screen.getByText('Use service and environment'));
    expect(keyField()).toHaveValue('Db/Host');
    expect(screen.getByTitle('billing')).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: 'production' })).toBeChecked();
  });

  it('keeps the form open when some fail, and retries them', async () => {
    const user = userEvent.setup();
    api.parametersService.put.mockImplementation(async ({ name }) => {
      if (name.startsWith('/staging/')) {
        throw Object.assign(new Error('Denied'), { code: 'AccessDenied' });
      }
      return { version: 1 };
    });
    setup(atService);
    await user.click(screen.getByText('Select all'));
    await user.type(keyField(), 'Timeout');
    await user.type(valueField(), '30');
    await user.click(
      screen.getByRole('button', { name: 'Create in 2 environments' })
    );

    expect(
      await screen.findByText('Created 1 of 2. 1 failed.')
    ).toBeInTheDocument();
    expect(screen.getByText('AccessDenied: Denied')).toBeInTheDocument();
    expect(screen.getByText('Created')).toBeInTheDocument();

    api.parametersService.put.mockResolvedValue({ version: 1 });
    await user.click(screen.getByRole('button', { name: 'Retry failed' }));
    await waitFor(() =>
      expect(useUiStore.getState().selectedName).toBe(
        '/development/compass/AppServer/Timeout'
      )
    );
    expect(api.parametersService.put).toHaveBeenLastCalledWith(
      expect.objectContaining({ name: '/staging/compass/AppServer/Timeout' })
    );
  });

  it('moves to the created parameter', async () => {
    const user = userEvent.setup();
    setup(atService);
    await user.click(screen.getByText('Use a custom path'));
    await user.clear(pathField());
    await user.type(pathField(), '/production/billing/New');
    await user.type(valueField(), 'v');
    await user.click(screen.getByRole('button', { name: 'Create parameter' }));
    await waitFor(() =>
      expect(getLocation()).toEqual({
        view: 'services',
        service: 'billing',
        env: 'production',
        folder: ''
      })
    );
  });
});

describe('Duplicate', () => {
  const source = {
    description: 'desc',
    type: 'SecureString' as const,
    kmsKey: 'alias/custom',
    value: 'secret'
  };

  it('copies into the source service and environment', () => {
    setup({
      ...atService,
      prefill: { source: '/staging/compass/AppServer/Port', ...source }
    });
    expect(screen.getByText('Duplicate parameter')).toBeInTheDocument();
    expect(keyField()).toHaveValue('AppServer/PortCopy');
    expect(screen.getByRole('checkbox', { name: 'staging' })).toBeChecked();
    expect(screen.getByText('alias/custom')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Create parameter' })
    ).toBeEnabled();
  });

  it('copies to a path otherwise', () => {
    setup({ prefill: { source: '/dev/app/Existing', ...source } });
    expect(pathField()).toHaveValue('/dev/app/ExistingCopy');
  });
});
