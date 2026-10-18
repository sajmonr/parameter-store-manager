import { Modal } from 'antd';
import { uiActions, useUiStore } from '../../state/ui';
import useEscape from '../../hooks/useEscape';
import ExportForm from './ExportForm';

const ExportModal = () => {
  const open = useUiStore(state => state.exportOpen);
  const close = uiActions.closeExport;

  useEscape(close, open);

  return (
    <Modal
      open={open}
      title="Export as CSV"
      width={520}
      onCancel={close}
      keyboard={false}
      footer={null}
      destroyOnHidden
    >
      {/* Mounted per opening, so the form starts from the current folder. */}
      {open && <ExportForm onClose={close} />}
    </Modal>
  );
};

export default ExportModal;
