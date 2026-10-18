import { useState } from 'react';
import { Modal } from 'antd';
import { uiActions, useUiStore } from '../../state/ui';
import useEscape from '../../hooks/useEscape';
import ExportForm from './ExportForm';

const ExportModal = () => {
  const open = useUiStore(state => state.exportOpen);
  // Once the file is being saved the export can't be stopped, so the modal
  // can't be closed either.
  const [saving, setSaving] = useState(false);
  const close = () => {
    if (!saving) uiActions.closeExport();
  };

  useEscape(close, open);

  return (
    <Modal
      open={open}
      title="Export as CSV"
      width={520}
      onCancel={close}
      closable={!saving}
      mask={{ closable: !saving }}
      keyboard={false}
      footer={null}
      destroyOnHidden
    >
      {/* Mounted per opening, so the form starts from the current folder. */}
      {open && <ExportForm onClose={close} onSavingChange={setSaving} />}
    </Modal>
  );
};

export default ExportModal;
