import { describe, expect, it } from 'vitest';
import { actions, selectors } from './ui';
import { createTestStore, makeParameter } from '../test/testStore';

const names = [
  '/dev/app/db/Password',
  '/dev/app/db/Host',
  '/dev/app/Title',
  '/prd/app/db/Password'
];
const setup = () =>
  createTestStore({ parameters: names.map(n => makeParameter(n)) });
const visibleNames = store =>
  selectors.getVisibleParameters(store.getState()).map(p => p.Name);

describe('ui duck', () => {
  it('filters the table by query and scope, and the tree by query only', () => {
    const store = setup();
    store.dispatch(actions.setScope('/dev/'));
    store.dispatch(actions.setQuery('password'));

    expect(visibleNames(store)).toEqual(['/dev/app/db/Password']);
    const tree = selectors.getMatchedFolderTree(store.getState());
    expect(tree.roots.map(f => [f.key, f.count])).toEqual([
      ['/dev/', 1],
      ['/prd/', 1]
    ]);
  });

  it('expands the path to a new scope', () => {
    const store = setup();
    store.dispatch(actions.setScope('/dev/app/db/'));
    expect(selectors.getExpandedFolders(store.getState())).toEqual([
      '/dev/',
      '/dev/app/',
      '/dev/app/db/'
    ]);
  });

  it('opens the detail pane on selection and closes it again', () => {
    const store = setup();
    store.dispatch(actions.selectParameter('/dev/app/Title'));
    expect(selectors.getPaneMode(store.getState())).toBe('detail');
    expect(selectors.getSelectedParameter(store.getState()).Value).toBe(
      'value of /dev/app/Title'
    );

    store.dispatch(actions.closePane());
    expect(selectors.getPaneMode(store.getState())).toBe(null);
    expect(selectors.getSelectedParameter(store.getState())).toBe(null);
  });

  it('opens the new form with a prefill', () => {
    const store = setup();
    const prefill = { folder: '/dev/', name: 'TitleCopy' };
    store.dispatch(actions.openNewParameter(prefill));
    expect(selectors.getPaneMode(store.getState())).toBe('new');
    expect(selectors.getNewPrefill(store.getState())).toBe(prefill);
  });

  it('shows a created parameter outside the scope by moving the scope', () => {
    const store = setup();
    store.dispatch(actions.setScope('/prd/'));
    store.dispatch(actions.setQuery('nothing matches'));
    store.dispatch(actions.showCreatedParameter('/dev/app/db/Host'));

    const state = store.getState();
    expect(selectors.getQuery(state)).toBe('');
    expect(selectors.getScope(state)).toBe('/dev/app/db/');
    expect(selectors.getSelectedName(state)).toBe('/dev/app/db/Host');
    expect(selectors.getExpandedFolders(state)).toContain('/dev/app/db/');
  });

  it('keeps the scope when a created parameter is inside it', () => {
    const store = setup();
    store.dispatch(actions.setScope('/dev/'));
    store.dispatch(actions.showCreatedParameter('/dev/app/db/Host'));
    expect(selectors.getScope(store.getState())).toBe('/dev/');
  });
});
