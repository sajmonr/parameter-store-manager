// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { DEFAULT_STRUCTURE } from '../../shared/structure';
import type { Structure } from '../../shared/structure';
import { createWrapper } from '../test/render';
import { createTestState, makeParameter } from '../test/testState';
import { environmentNodeKey, serviceNodeKey } from '../utils/location';
import { useSettingsStore } from './settings';
import { getLocation, uiActions, useUiStore } from './ui';
import {
  useMatchedFolderTree,
  useSelectedParameter,
  useServicesTree,
  useVisibleParameters
} from './views';

const names = [
  '/dev/app/db/Password',
  '/dev/app/db/Host',
  '/dev/app/Title',
  '/prd/app/db/Password'
];

const setup = () =>
  renderHook(
    () => ({
      visible: useVisibleParameters(),
      tree: useMatchedFolderTree(),
      selected: useSelectedParameter()
    }),
    {
      wrapper: createWrapper(
        createTestState({ parameters: names.map(n => makeParameter(n)) })
      )
    }
  );

const ui = () => useUiStore.getState();

describe('ui state', () => {
  it('filters the table by query and scope, and the tree by query only', () => {
    const { result } = setup();
    act(() => {
      uiActions.setScope('/dev/');
      uiActions.setQuery('password');
    });

    expect(result.current.visible.map(p => p.Name)).toEqual([
      '/dev/app/db/Password'
    ]);
    expect(result.current.tree.roots.map(f => [f.key, f.count])).toEqual([
      ['/dev/', 1],
      ['/prd/', 1]
    ]);
  });

  it('expands the path to a new scope', () => {
    setup();
    uiActions.setScope('/dev/app/db/');
    expect(ui().expanded.paths).toEqual(['/dev/', '/dev/app/', '/dev/app/db/']);
  });

  it('opens the detail pane on selection and closes it again', () => {
    const { result } = setup();
    act(() => uiActions.selectParameter('/dev/app/Title'));
    expect(ui().paneMode).toBe('detail');
    expect(result.current.selected?.Value).toBe('value of /dev/app/Title');

    act(() => uiActions.closePane());
    expect(ui().paneMode).toBe(null);
    expect(result.current.selected).toBe(null);
  });

  it('opens the new form with a prefill', () => {
    setup();
    const prefill = { source: '/dev/Title' };
    uiActions.openNewParameter(prefill);
    expect(ui().paneMode).toBe('new');
    expect(ui().newPrefill).toBe(prefill);
  });

  it('shows a created parameter outside the scope by moving the scope', () => {
    setup();
    uiActions.setScope('/prd/');
    uiActions.setQuery('nothing matches');
    uiActions.showCreatedParameter('/dev/app/db/Host');

    expect(ui().query).toBe('');
    expect(getLocation()).toEqual({ view: 'paths', scope: '/dev/app/db/' });
    expect(ui().selectedName).toBe('/dev/app/db/Host');
    expect(ui().expanded.paths).toContain('/dev/app/db/');
  });

  it('keeps the scope when a created parameter is inside it', () => {
    setup();
    uiActions.setScope('/dev/');
    uiActions.showCreatedParameter('/dev/app/db/Host');
    expect(getLocation()).toEqual({ view: 'paths', scope: '/dev/' });
  });

  it('switches pages without touching the Parameters state', () => {
    setup();
    uiActions.setScope('/dev/');
    uiActions.selectParameter('/dev/app/Title');

    uiActions.showPage('importExport');
    expect(ui().page).toBe('importExport');
    uiActions.openSettings();
    expect(ui().page).toBe('settings');

    uiActions.showPage('parameters');
    expect(getLocation()).toEqual({ view: 'paths', scope: '/dev/' });
    expect(ui().selectedName).toBe('/dev/app/Title');
  });

  it('opens Settings on the section used last unless one is given', () => {
    setup();
    expect(ui().settingsSection).toBe('aws');

    uiActions.openSettings();
    uiActions.showSettingsSection('display');
    uiActions.showPage('parameters');
    uiActions.openSettings();
    expect(ui().page).toBe('settings');
    expect(ui().settingsSection).toBe('display');

    uiActions.openSettings('aws');
    expect(ui().settingsSection).toBe('aws');
  });
});

describe('ui state in the Services view', () => {
  const structure: Structure = {
    ...DEFAULT_STRUCTURE,
    enabled: true,
    services: [
      { segment: 'compass', environments: ['development', 'staging'] },
      { segment: 'billing', environments: ['production'] }
    ]
  };
  const grouped = [
    '/development/compass/App/Port',
    '/development/compass/Flag',
    '/staging/compass/App/Port',
    '/production/billing/Key',
    '/random/thing'
  ];
  const setupGrouped = () =>
    renderHook(() => useVisibleParameters(), {
      wrapper: createWrapper(
        createTestState({
          parameters: grouped.map(n => makeParameter(n)),
          settings: { structure }
        })
      )
    });
  const compass = (env: string, folder = '') => ({
    view: 'services' as const,
    service: 'compass',
    env,
    folder
  });

  it('opens on the first service in its first environment', () => {
    const { result } = setupGrouped();
    expect(getLocation()).toEqual(compass('development'));
    expect(result.current.map(p => p.Name)).toEqual([
      '/development/compass/App/Port',
      '/development/compass/Flag'
    ]);
  });

  it('keeps the service and folder when the environment changes', () => {
    setupGrouped();
    uiActions.setLocation(compass('development', 'App/'));
    uiActions.setEnv('staging');
    expect(getLocation()).toEqual(compass('staging', 'App/'));
  });

  it('keeps the environment across services that are in it', () => {
    setupGrouped();
    uiActions.setEnv('staging');
    // A sidebar click into another service.
    uiActions.setLocation(
      { view: 'services', service: 'billing', env: 'staging', folder: '' },
      { rememberEnv: false }
    );
    // billing isn't in staging.
    expect(getLocation()).toMatchObject({ env: 'production' });
    expect(ui().lastEnv).toBe('staging');
    uiActions.setLocation(compass('staging'), { rememberEnv: false });
    expect(getLocation()).toEqual(compass('staging'));
  });

  it('counts and opens folders in the environment shown after coming back from Paths', () => {
    const { result } = renderHook(() => useServicesTree(), {
      wrapper: createWrapper(
        createTestState({
          parameters: grouped.map(n => makeParameter(n)),
          settings: { structure }
        })
      )
    });
    act(() => {
      uiActions.setEnv('staging');
      uiActions.setView('paths');
      uiActions.setScope('/development/compass/');
      uiActions.setView('services');
    });
    expect(getLocation()).toEqual(compass('development'));
    // Other services now open on development too.
    expect(ui().lastEnv).toBe('development');

    const [compassNode] = result.current.services;
    expect(compassNode!.count).toBe(2);
    const app = compassNode!.children.find(f => f.label === 'App')!;
    expect(app.count).toBe(1);
    act(() => uiActions.setLocation(app.location));
    expect(getLocation()).toEqual(compass('development', 'App/'));
  });

  it('switches to Paths and back at the same place', () => {
    setupGrouped();
    uiActions.setLocation(compass('staging', 'App/'));
    uiActions.setView('paths');
    expect(getLocation()).toEqual({
      view: 'paths',
      scope: '/staging/compass/App/'
    });
    expect(ui().expanded.paths).toContain('/staging/compass/App/');
    uiActions.setView('services');
    expect(getLocation()).toEqual(compass('staging', 'App/'));
  });

  it('keeps the selection when switching views', () => {
    setupGrouped();
    uiActions.selectParameter('/random/thing');
    uiActions.setView('paths');
    expect(ui().selectedName).toBe('/random/thing');
    // /development/compass/ doesn't list it, so its folder opens.
    expect(getLocation()).toEqual({ view: 'paths', scope: '/random/' });
    uiActions.setView('services');
    expect(getLocation()).toEqual({
      view: 'services',
      other: true,
      folder: '/random/'
    });
  });

  it('shows a created parameter in place, or goes to its folder', () => {
    setupGrouped();
    uiActions.showCreatedParameter('/development/compass/App/New');
    expect(getLocation()).toEqual(compass('development'));
    expect(ui().expanded.services).toContain(serviceNodeKey('compass', 'App/'));
    expect(ui().selectedName).toBe('/development/compass/App/New');

    uiActions.showCreatedParameter('/staging/compass/Other');
    expect(getLocation()).toEqual(compass('staging'));
  });

  it('falls back when the selected service is removed', () => {
    setupGrouped();
    uiActions.setLocation({
      view: 'services',
      service: 'billing',
      env: 'production',
      folder: ''
    });
    act(() =>
      useSettingsStore.setState({
        structure: { ...structure, services: structure.services.slice(0, 1) }
      })
    );
    expect(getLocation()).toEqual(compass('development'));
  });

  it('switches between all three views without losing the selection', () => {
    setupGrouped();
    const name = '/staging/compass/App/Port';
    uiActions.setLocation(compass('development'));
    uiActions.selectParameter(name);

    uiActions.setView('environments');
    expect(getLocation()).toEqual({
      view: 'environments',
      env: 'staging',
      service: 'compass',
      folder: 'App/'
    });
    expect(ui().expanded.environments).toEqual(
      expect.arrayContaining([
        environmentNodeKey('staging'),
        environmentNodeKey('staging', 'compass'),
        environmentNodeKey('staging', 'compass', 'App/')
      ])
    );
    uiActions.setView('paths');
    expect(getLocation()).toEqual({
      view: 'paths',
      scope: '/staging/compass/App/'
    });
    uiActions.setView('services');
    expect(getLocation()).toEqual(compass('staging', 'App/'));
    expect(ui().selectedName).toBe(name);
  });

  it('keeps the place between the views with nothing selected', () => {
    setupGrouped();
    uiActions.setLocation(compass('staging', 'App/'));
    uiActions.setView('environments');
    expect(getLocation()).toEqual({
      view: 'environments',
      env: 'staging',
      service: 'compass',
      folder: 'App/'
    });

    // A whole environment opens on a service in it.
    uiActions.setLocation({
      view: 'environments',
      env: 'production',
      service: null,
      folder: ''
    });
    uiActions.setView('services');
    expect(getLocation()).toEqual({
      view: 'services',
      service: 'billing',
      env: 'production',
      folder: ''
    });

    uiActions.setView('paths');
    uiActions.setScope('/development/');
    uiActions.setView('environments');
    expect(getLocation()).toEqual({
      view: 'environments',
      env: 'development',
      service: null,
      folder: ''
    });
    uiActions.setView('paths');
    expect(getLocation()).toEqual({ view: 'paths', scope: '/development/' });
  });

  it('is in the Paths view while the switch is off', () => {
    setupGrouped();
    uiActions.setLocation(compass('staging', 'App/'));
    act(() =>
      useSettingsStore.setState({ structure: { ...structure, enabled: false } })
    );
    expect(getLocation()).toEqual({
      view: 'paths',
      scope: '/staging/compass/App/'
    });
  });
});
