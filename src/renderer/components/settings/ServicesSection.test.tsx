// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  act,
  renderHook,
  screen,
  waitFor,
  within
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import * as api from '../../test/mockServices';
import type { Settings } from '../../../shared/availableSettings';
import { DEFAULT_STRUCTURE } from '../../../shared/structure';
import type { Structure } from '../../../shared/structure';
import { parametersKey } from '../../state/parameters';
import type { ParameterList } from '../../state/parameters';
import { useSettingsStore } from '../../state/settings';
import { uiActions } from '../../state/ui';
import { useStructuredParameters } from '../../state/views';
import { createWrapper, renderWithProviders } from '../../test/render';
import { createTestState, makeParameter } from '../../test/testState';
import SettingsPage from '../pages/SettingsPage';

vi.mock('../../services', () => import('../../test/mockServices'));

const structure: Structure = {
  ...DEFAULT_STRUCTURE,
  enabled: true,
  services: [
    {
      segment: 'compass',
      environments: ['development', 'staging', 'production']
    },
    { segment: 'assessment', environments: ['development', 'staging'] }
  ]
};

// 5 match; /production/assessment/A is in Other because assessment isn't in
// production, and /other/thing because it fits no environment.
const names = [
  '/development/compass/A',
  '/development/compass/B',
  '/staging/compass/A',
  '/production/compass/A',
  '/development/assessment/A',
  '/production/assessment/A',
  '/other/thing'
];

const setup = (
  settings: Partial<Settings> = { structure },
  { parameters = names } = {}
) => {
  const queryClient = createTestState({
    parameters: parameters.map(name => makeParameter(name)),
    settings
  });
  uiActions.openSettings('services');
  return renderWithProviders(<SettingsPage />, { queryClient });
};

const saved = () => useSettingsStore.getState().structure;

// The structure of the last save.
const lastSaved = () =>
  api.settingsService.set.mock.lastCall?.[0].structure as Structure;

// The services grid's row, found by its remove button. Matching rows by
// their accessible name reads every checkbox in the grid, which is slow
// enough to time out on CI's Windows runners.
const row = (service: string) =>
  screen.getByRole('button', { name: `Remove ${service}` }).closest('tr')!;

// The environments table's row, found by its segment input.
const envRow = (segment: string) =>
  screen
    .getByRole('textbox', { name: `Environment ${segment}` })
    .closest('tr')!;

const switchControl = () =>
  screen.getByRole('switch', { name: 'Group by service and environment' });

beforeEach(() => {
  vi.clearAllMocks();
  api.parametersService.describe.mockReturnValue(new Promise(() => {}));
  // Saves like the main process: the given keys over the stored settings.
  api.settingsService.set.mockImplementation(values =>
    Promise.resolve({ ...useSettingsStore.getState(), ...values })
  );
});

describe('the switch', () => {
  it('starts off on a fresh install and shows nothing else', () => {
    setup({});
    expect(switchControl()).not.toBeChecked();
    expect(screen.queryByText('Path structure')).toBeNull();
    expect(screen.queryByText('Environments')).toBeNull();
  });

  it('keeps the configuration when turned off and on', async () => {
    const user = userEvent.setup();
    setup();

    await user.click(switchControl());
    await waitFor(() => expect(saved().enabled).toBe(false));
    expect(lastSaved()).toEqual({ ...structure, enabled: false });
    expect(screen.queryByText('Path structure')).toBeNull();

    await user.click(switchControl());
    await waitFor(() => expect(saved()).toEqual(structure));
    expect(screen.getByText('Path structure')).toBeInTheDocument();
  });

  it('toggles from anywhere on its card', async () => {
    const user = userEvent.setup();
    setup({});

    await user.click(screen.getByText(/Adds Services and Environments views/));
    await waitFor(() => expect(saved().enabled).toBe(true));
    expect(api.settingsService.set).toHaveBeenCalledTimes(1);
  });
});

describe('Path structure', () => {
  it('shows how many parameters the layout matches', async () => {
    const user = userEvent.setup();
    setup();

    expect(
      screen.getByText('5 of 7 parameters match. 2 appear under Other paths.')
    ).toBeInTheDocument();
    expect(
      screen.getByRole('radio', { name: /Environment convention/ })
    ).toBeChecked();

    await user.click(
      screen.getByRole('radio', { name: /Services convention/ })
    );
    expect(
      await screen.findByText(
        'No parameters match this structure. All 7 will appear under Other paths.'
      )
    ).toBeInTheDocument();
    expect(saved().layout).toBe('svc-first');
  });

  it('shows no stats before parameters load', () => {
    setup({ structure }, { parameters: [] });
    expect(screen.queryByText(/parameters match/)).toBeNull();
    expect(screen.queryByText(/No parameters match/)).toBeNull();
  });

  it('shows no stats while the first load is still streaming in', async () => {
    const { queryClient } = setup();
    act(() =>
      queryClient.setQueryData<ParameterList>(
        parametersKey('', 'us-east-1'),
        list => list && { ...list, syncedAt: null }
      )
    );
    // The query notifies on a timer.
    await waitFor(() =>
      expect(screen.queryByText(/parameters match/)).toBeNull()
    );
  });
});

describe('Environments', () => {
  it('counts the matched parameters in each environment', () => {
    setup();
    expect(within(envRow('development')).getByText('3')).toBeInTheDocument();
    expect(within(envRow('staging')).getByText('1')).toBeInTheDocument();
    // assessment's production parameter is in Other.
    expect(within(envRow('production')).getByText('1')).toBeInTheDocument();
  });

  it('renames a segment in every service', async () => {
    const user = userEvent.setup();
    setup();
    const input = screen.getByRole('textbox', { name: 'Environment staging' });

    await user.clear(input);
    await user.type(input, 'stage{Enter}');
    await waitFor(() =>
      expect(saved().environments.map(e => e.segment)).toEqual([
        'development',
        'stage',
        'production'
      ])
    );
    expect(saved().services.map(s => s.environments)).toEqual([
      ['development', 'stage', 'production'],
      ['development', 'stage']
    ]);
    expect(api.settingsService.set).toHaveBeenCalledTimes(1);
  });

  it("doesn't save an invalid segment", async () => {
    const user = userEvent.setup();
    setup();
    const input = screen.getByRole('textbox', { name: 'Environment staging' });

    await user.clear(input);
    await user.type(input, 'production');
    await user.tab();
    expect(screen.getByText('Already in the list.')).toBeInTheDocument();

    await user.clear(input);
    await user.type(input, 'dev/eu{Enter}');
    expect(screen.getByText('Can\'t contain "/".')).toBeInTheDocument();
    expect(api.settingsService.set).not.toHaveBeenCalled();
  });

  it('reverts only the field Esc is pressed in', async () => {
    const user = userEvent.setup();
    setup();
    const staging = screen.getByRole('textbox', {
      name: 'Environment staging'
    });
    const production = screen.getByRole('textbox', {
      name: 'Environment production'
    });

    await user.clear(staging);
    await user.type(staging, 'a b');
    await user.clear(production);
    await user.type(production, 'c d');
    await user.tab();
    expect(screen.getAllByText("Can't contain spaces.")).toHaveLength(2);

    await user.click(staging);
    await user.keyboard('{Escape}');
    expect(staging).toHaveValue('staging');
    expect(production).toHaveValue('c d');
    expect(api.settingsService.set).not.toHaveBeenCalled();
  });

  it('removes an environment from every service after confirming', async () => {
    const user = userEvent.setup();
    setup();

    await user.click(screen.getByRole('button', { name: 'Remove staging' }));
    expect(
      await screen.findByText('Its parameters will appear under Other paths.')
    ).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Remove' }));
    await waitFor(() =>
      expect(saved().environments.map(e => e.segment)).toEqual([
        'development',
        'production'
      ])
    );
    expect(saved().services.map(s => s.environments)).toEqual([
      ['development', 'production'],
      ['development']
    ]);
  });

  it('adds an environment with the next colour once its segment is valid', async () => {
    const user = userEvent.setup();
    setup();

    await user.click(screen.getByRole('button', { name: /Add environment/ }));
    const input = screen.getByRole('textbox', { name: 'New environment' });
    expect(input).toHaveFocus();

    await user.type(input, 'qa a{Enter}');
    expect(screen.getByText("Can't contain spaces.")).toBeInTheDocument();
    expect(api.settingsService.set).not.toHaveBeenCalled();

    await user.type(input, '{Backspace}{Backspace}{Enter}');
    await waitFor(() =>
      expect(saved().environments.at(-1)).toEqual({
        segment: 'qa',
        color: '#1677ff'
      })
    );
    expect(
      screen.queryByRole('textbox', { name: 'New environment' })
    ).toBeNull();
    expect(
      screen.getByRole('textbox', { name: 'Environment qa' })
    ).toBeInTheDocument();
  });

  it('drops an added row left empty', async () => {
    const user = userEvent.setup();
    setup();

    await user.click(screen.getByRole('button', { name: /Add environment/ }));
    await user.click(screen.getByText('Path structure'));
    expect(
      screen.queryByRole('textbox', { name: 'New environment' })
    ).toBeNull();
    expect(api.settingsService.set).not.toHaveBeenCalled();
  });

  it('picks any colour, saved as hex', async () => {
    const user = userEvent.setup();
    setup();

    await user.click(
      screen.getByRole('button', { name: 'development color: #52c41a' })
    );
    const hex = (await waitFor(() =>
      document.querySelector('.ant-color-picker-hex-input input')
    )) as HTMLInputElement;
    await user.clear(hex);
    await user.type(hex, '123ABC');
    await user.tab();
    await waitFor(() => expect(saved().environments[0]!.color).toBe('#123abc'));

    // The suggested colours are antd's presets.
    await user.click(
      document.querySelectorAll<HTMLElement>(
        '.ant-color-picker-presets-color'
      )[4]!
    );
    await waitFor(() => expect(saved().environments[0]!.color).toBe('#722ed1'));
  });

  it('shows the saved colour again when saving fails', async () => {
    const user = userEvent.setup();
    api.settingsService.set.mockRejectedValueOnce(new Error('Disk full'));
    setup();

    await user.click(
      screen.getByRole('button', { name: 'development color: #52c41a' })
    );
    const hex = (await waitFor(() =>
      document.querySelector('.ant-color-picker-hex-input input')
    )) as HTMLInputElement;
    await user.clear(hex);
    await user.type(hex, '123abc');
    await user.tab();
    expect(await screen.findByText('Disk full')).toBeInTheDocument();
    expect(
      await screen.findByRole('button', { name: 'development color: #52c41a' })
    ).toBeInTheDocument();
    expect(saved().environments[0]!.color).toBe('#52c41a');
  });

  it('shows the colour of an added row, which changes once saved', async () => {
    const user = userEvent.setup();
    setup();

    await user.click(screen.getByRole('button', { name: /Add environment/ }));
    expect(
      screen.getByRole('button', { name: 'New environment color: #1677ff' })
    ).toBeDisabled();

    await user.type(
      screen.getByRole('textbox', { name: 'New environment' }),
      'qa{Enter}'
    );
    expect(
      await screen.findByRole('button', { name: 'qa color: #1677ff' })
    ).toBeEnabled();
  });

  it('discards a typed added row without saving it', async () => {
    const user = userEvent.setup();
    setup();

    await user.click(screen.getByRole('button', { name: /Add environment/ }));
    await user.type(
      screen.getByRole('textbox', { name: 'New environment' }),
      'qa'
    );
    await user.click(
      screen.getByRole('button', { name: 'Discard new environment' })
    );
    expect(
      screen.queryByRole('textbox', { name: 'New environment' })
    ).toBeNull();
    expect(api.settingsService.set).not.toHaveBeenCalled();
  });
});

describe('Services', () => {
  it('counts each combination, with unchecked ones in Other', () => {
    setup();
    const compass = row('compass');
    expect(
      within(compass).getByRole('checkbox', { name: 'compass in development' })
    ).toBeChecked();
    // development 2, staging 1, production 1, Total 4.
    expect(within(compass).getByText('2')).toBeInTheDocument();
    expect(within(compass).getByText('4')).toBeInTheDocument();

    const assessment = row('assessment');
    expect(
      within(assessment).getByRole('checkbox', {
        name: 'assessment in production'
      })
    ).not.toBeChecked();
    expect(within(assessment).getByText('1 in Other')).toBeInTheDocument();
  });

  it('matches the counts useStructuredParameters gives', () => {
    const { queryClient } = setup();
    const { result } = renderHook(useStructuredParameters, {
      wrapper: createWrapper(queryClient)
    });
    expect(result.current.byService.get('compass')).toBe(4);
    expect(result.current.byEnv.get('development')).toBe(3);
    expect(result.current.inOther.get('assessment')?.get('production')).toBe(1);
  });

  it('moves an unchecked combination to Other', async () => {
    const user = userEvent.setup();
    setup();

    await user.click(
      screen.getByRole('checkbox', { name: 'compass in staging' })
    );
    await waitFor(() =>
      expect(saved().services[0]!.environments).toEqual([
        'development',
        'production'
      ])
    );
    expect(within(row('compass')).getByText('1 in Other')).toBeInTheDocument();
    expect(
      screen.getByText('4 of 7 parameters match. 3 appear under Other paths.')
    ).toBeInTheDocument();
  });

  it('applies quick changes one after another', async () => {
    const user = userEvent.setup();
    let resolveFirst: () => void = () => {};
    api.settingsService.set.mockImplementationOnce(
      values =>
        new Promise(resolve => {
          resolveFirst = () =>
            resolve({ ...useSettingsStore.getState(), ...values });
        })
    );
    setup();

    await user.click(
      screen.getByRole('checkbox', { name: 'compass in staging' })
    );
    await user.click(
      screen.getByRole('checkbox', { name: 'assessment in production' })
    );
    resolveFirst();
    await waitFor(() =>
      expect(api.settingsService.set).toHaveBeenCalledTimes(2)
    );
    await waitFor(() =>
      expect(saved().services.map(s => s.environments)).toEqual([
        ['development', 'production'],
        ['development', 'staging', 'production']
      ])
    );
  });

  it('adds a service in every environment with a new tag until the section is left', async () => {
    const user = userEvent.setup();
    setup();
    const input = screen.getByRole('textbox', { name: 'New service' });

    await user.type(input, 'compass{Enter}');
    expect(screen.getByText('Already in the list.')).toBeInTheDocument();

    await user.clear(input);
    await user.type(input, 'notifications{Enter}');
    await waitFor(() =>
      expect(saved().services.at(-1)).toEqual({
        segment: 'notifications',
        environments: ['development', 'staging', 'production']
      })
    );
    expect(input).toHaveValue('');
    expect(within(row('notifications')).getByText('new')).toBeInTheDocument();

    await user.click(screen.getByRole('menuitem', { name: /Display/ }));
    await user.click(
      screen.getByRole('menuitem', { name: /Services & environments/ })
    );
    expect(within(row('notifications')).queryByText('new')).toBeNull();
  });

  it('also adds with the button', async () => {
    const user = userEvent.setup();
    setup();

    await user.type(
      screen.getByRole('textbox', { name: 'New service' }),
      'billing'
    );
    await user.click(screen.getByRole('button', { name: /Add service/ }));
    await waitFor(() =>
      expect(saved().services.map(s => s.segment)).toContain('billing')
    );
  });

  it('keeps a name typed while the previous one saves', async () => {
    const user = userEvent.setup();
    let resolveSave: () => void = () => {};
    api.settingsService.set.mockImplementationOnce(
      values =>
        new Promise(resolve => {
          resolveSave = () =>
            resolve({ ...useSettingsStore.getState(), ...values });
        })
    );
    setup();
    const input = screen.getByRole('textbox', { name: 'New service' });

    await user.type(input, 'billing{Enter}');
    await user.clear(input);
    await user.type(input, 'search');
    act(() => resolveSave());
    await waitFor(() =>
      expect(saved().services.map(s => s.segment)).toContain('billing')
    );
    expect(input).toHaveValue('search');
  });

  it('removes a service after confirming', async () => {
    const user = userEvent.setup();
    setup();

    await user.click(screen.getByRole('button', { name: 'Remove assessment' }));
    await user.click(await screen.findByRole('button', { name: 'Remove' }));
    await waitFor(() =>
      expect(saved().services.map(s => s.segment)).toEqual(['compass'])
    );
  });
});

describe('Display', () => {
  it('shows the default view only while the switch is on', async () => {
    const user = userEvent.setup();
    setup({});
    act(() => uiActions.showSettingsSection('display'));
    expect(await screen.findByText('Theme')).toBeVisible();
    expect(screen.queryByText('Default view')).toBeNull();

    act(() => uiActions.showSettingsSection('services'));
    await user.click(switchControl());
    act(() => uiActions.showSettingsSection('display'));
    expect(await screen.findByText('Default view')).toBeVisible();

    await user.click(
      within(
        screen.getByText('Default view').closest('.ant-form-item')!
      ).getByText('Environments')
    );
    await waitFor(() =>
      expect(useSettingsStore.getState().defaultView).toBe('environments')
    );
  });

  it('rejects a delimiter a segment contains', async () => {
    const user = userEvent.setup();
    setup({
      structure: {
        ...structure,
        environments: [{ segment: 'dev-eu', color: '#52c41a' }],
        services: []
      }
    });
    act(() => uiActions.showSettingsSection('display'));
    const input = await screen.findByRole('textbox', {
      name: /Path delimiter/
    });

    await user.clear(input);
    await user.type(input, '-{Enter}');
    expect(screen.getByText('"dev-eu" contains "-".')).toBeInTheDocument();
    expect(api.settingsService.set).not.toHaveBeenCalled();
  });
});
