import { useEffect } from 'react';
import { Skeleton } from 'antd';
import { useParameters } from '../../state/parameters';
import { useSettingsStore } from '../../state/settings';
import { uiActions, useUiStore } from '../../state/ui';
import { useLocation } from '../../state/views';
import EnvironmentsTree from './EnvironmentsTree';
import FolderTree from './FolderTree';
import ServicesTree from './ServicesTree';
import ViewSwitcher from './ViewSwitcher';
import styles from './Sidebar.module.css';

// The view switcher, while grouping is on, and the current view's tree.
const Sidebar = () => {
  const { loadState } = useParameters();
  const grouping = useSettingsStore(settings => settings.structure.enabled);
  const location = useLocation();
  const { view } = location;
  const started = useUiStore(state => state.location !== null);

  // A grouped view opens with its service or environment expanded. The Paths view starts
  // at the root, which has nothing to expand, and stays unset so turning
  // grouping on opens the default view.
  useEffect(() => {
    if (!started && view !== 'paths') uiActions.setLocation(location);
  }, [started, view, location]);

  const trees = {
    paths: <FolderTree />,
    services: <ServicesTree />,
    environments: <EnvironmentsTree />
  };
  let tree = trees[view];
  if (loadState === 'loading') {
    tree = (
      <Skeleton
        active
        title={false}
        paragraph={{ rows: 8 }}
        className={styles.skeleton}
      />
    );
  }

  return (
    <>
      {grouping && <ViewSwitcher />}
      {tree}
    </>
  );
};

export default Sidebar;
