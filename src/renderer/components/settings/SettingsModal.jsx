import React from 'react';
import { Modal } from 'antd';
import { useDispatch, useSelector } from 'react-redux';
import { actions as uiActions, selectors as uiSelectors } from '../../ducks/ui';
import useEscape from '../../hooks/useEscape';
import SettingsForm from './SettingsForm';

const SettingsModal = () => {
  const dispatch = useDispatch();
  const open = useSelector(uiSelectors.getIsSettingsOpen);
  const close = () => dispatch(uiActions.closeSettings());

  useEscape(close, open);

  return (
    <Modal
      open={open}
      title="Settings"
      width={480}
      onCancel={close}
      keyboard={false}
      footer={null}
      destroyOnHidden
    >
      {/* Mounted per opening, so the form always starts from the saved settings. */}
      {open && <SettingsForm onClose={close} />}
    </Modal>
  );
};

export default SettingsModal;
