import { useEffect } from 'react';
import type { ReactNode } from 'react';
import { PageVisibleContext } from '../hooks/usePageVisible';
import { menuService } from '../services';
import { uiActions, useUiStore } from '../state/ui';
import type { Page } from '../state/ui';
import { isSettingsShortcut } from '../utils/keys';
import { layoutVariables } from '../utils/layout';
import Rail from './rail/Rail';
import ParametersPage from './pages/ParametersPage';
import ImportExportPage from './pages/ImportExportPage';
import SettingsPage from './pages/SettingsPage';
import styles from './AppShell.module.css';

const onSettingsShortcut = (event: KeyboardEvent) => {
  if (!isSettingsShortcut(event)) return;
  event.preventDefault();
  uiActions.openSettings();
};

// Every page stays mounted, so it keeps its state, scroll position and form
// drafts; the hidden ones keep their layout too, so nothing is re-measured
// when they're shown again.
const PageFrame = ({ page, children }: { page: Page; children: ReactNode }) => {
  const visible = useUiStore(state => state.page === page);
  return (
    <PageVisibleContext.Provider value={visible}>
      <div
        className={visible ? styles.page : `${styles.page} ${styles.hidden}`}
        aria-hidden={!visible}
      >
        {children}
      </div>
    </PageVisibleContext.Provider>
  );
};

const AppShell = () => {
  useEffect(() => {
    window.addEventListener('keydown', onSettingsShortcut);
    const unsubscribe = menuService.onOpenSettings(uiActions.openSettings);
    return () => {
      window.removeEventListener('keydown', onSettingsShortcut);
      unsubscribe();
    };
  }, []);

  return (
    <div className={styles.shell} style={layoutVariables}>
      <Rail />
      <main className={styles.pages}>
        <PageFrame page="parameters">
          <ParametersPage />
        </PageFrame>
        <PageFrame page="importExport">
          <ImportExportPage />
        </PageFrame>
        <PageFrame page="settings">
          <SettingsPage />
        </PageFrame>
      </main>
    </div>
  );
};

export default AppShell;
