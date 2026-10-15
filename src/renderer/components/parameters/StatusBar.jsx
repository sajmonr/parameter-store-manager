import React from 'react';
import { useSelector } from 'react-redux';
import {
  LOAD_STATES,
  selectors as parameterSelectors
} from '../../ducks/parameters';
import { selectors as uiSelectors } from '../../ducks/ui';
import styles from './StatusBar.module.css';

const statusText = (loadState, visible, total) => {
  if (loadState === LOAD_STATES.loading) return 'Loading…';
  if (loadState === LOAD_STATES.ready)
    return `${visible} of ${total} parameters`;
  return '—';
};

const StatusBar = () => {
  const loadState = useSelector(parameterSelectors.getLoadState);
  const visible = useSelector(uiSelectors.getVisibleParameters).length;
  const total = useSelector(parameterSelectors.getNames).length;

  return (
    <div className={styles.bar}>
      <span>{statusText(loadState, visible, total)}</span>
      <span>↑↓ move · Esc close</span>
    </div>
  );
};

export default StatusBar;
