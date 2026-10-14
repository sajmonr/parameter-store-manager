import React from 'react';
import PropTypes from 'prop-types';
import { Drawer } from 'antd';
import { useDispatch, useSelector } from 'react-redux';
import {
  LOAD_STATES,
  selectors as parameterSelectors
} from '../../ducks/parameters';
import {
  actions as uiActions,
  PANE_MODES,
  selectors as uiSelectors
} from '../../ducks/ui';
import useEscape from '../../hooks/useEscape';
import ParameterDetail from './ParameterDetail';
import ParameterForm from '../form/ParameterForm';
import styles from './DetailHost.module.css';

export const PANE_WIDTH = 440;

// Hosts the selected parameter or the new-parameter form: docked on the
// right in a wide window, as a drawer in a narrow one. Not rendered at all
// while nothing is open.
const DetailHost = ({ narrow }) => {
  const dispatch = useDispatch();
  const loadState = useSelector(parameterSelectors.getLoadState);
  const paneMode = useSelector(uiSelectors.getPaneMode);
  const parameter = useSelector(uiSelectors.getSelectedParameter);
  const prefill = useSelector(uiSelectors.getNewPrefill);

  const close = () => dispatch(uiActions.closePane());

  let content = null;
  if (
    paneMode === PANE_MODES.detail &&
    parameter &&
    loadState === LOAD_STATES.ready
  ) {
    content = <ParameterDetail key={parameter.Name} parameter={parameter} />;
  } else if (
    paneMode === PANE_MODES.new &&
    (loadState === LOAD_STATES.ready || loadState === LOAD_STATES.empty)
  ) {
    // A new prefill (another Duplicate) starts a fresh form.
    content = <ParameterForm key={JSON.stringify(prefill)} prefill={prefill} />;
  }

  useEscape(close, !!content);

  if (narrow) {
    return (
      <Drawer
        open={!!content}
        onClose={close}
        placement="right"
        width={420}
        closable={false}
        keyboard={false}
        styles={{ body: { padding: 0 } }}
      >
        {content && <div className={styles.content}>{content}</div>}
      </Drawer>
    );
  }

  return (
    content && (
      <aside
        className={styles.pane}
        style={{ width: PANE_WIDTH }}
        aria-label="Details"
      >
        {content}
      </aside>
    )
  );
};

DetailHost.propTypes = {
  narrow: PropTypes.bool.isRequired
};

export default DetailHost;
