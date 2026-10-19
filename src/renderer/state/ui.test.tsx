// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { createWrapper } from '../test/render';
import { createTestState, makeParameter } from '../test/testState';
import { uiActions, useUiStore } from './ui';
import {
  useMatchedFolderTree,
  useSelectedParameter,
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
    expect(ui().expandedFolders).toEqual([
      '/dev/',
      '/dev/app/',
      '/dev/app/db/'
    ]);
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
    const prefill = { folder: '/dev/', name: 'TitleCopy' };
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
    expect(ui().scope).toBe('/dev/app/db/');
    expect(ui().selectedName).toBe('/dev/app/db/Host');
    expect(ui().expandedFolders).toContain('/dev/app/db/');
  });

  it('keeps the scope when a created parameter is inside it', () => {
    setup();
    uiActions.setScope('/dev/');
    uiActions.showCreatedParameter('/dev/app/db/Host');
    expect(ui().scope).toBe('/dev/');
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
    expect(ui().scope).toBe('/dev/');
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
