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
import SettingsModal from './settings/SettingsModal';
import ExportModal from './export/ExportModal';
import styles from './AppShell.module.css';

// Not over the export: changing the profile or region would stop it.
// TODO(#32): drop the check once the export runs on its own page.
const openSettingsUnlessExporting = () => {
  if (!useUiStore.getState().exportOpen) uiActions.openSettings();
};

const onSettingsShortcut = (event: KeyboardEvent) => {
  if (!isSettingsShortcut(event)) return;
  event.preventDefault();
  openSettingsUnlessExporting();
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
    const unsubscribe = menuService.onOpenSettings(openSettingsUnlessExporting);
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
      {/* TODO(#31), TODO(#32): remove with the modals. */}
      <SettingsModal />
      <ExportModal />
    </div>
  );
};

export default AppShell;
