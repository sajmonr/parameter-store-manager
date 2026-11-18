import { useEffect, useState } from 'react';
import { Flex, Modal, Typography } from 'antd';
import { uiActions, useUiStore } from '../../state/ui';
import type { CopyRequest } from '../../state/ui';
import { useCopyTargets } from '../../state/views';
import { COPY_MODAL_TOP, COPY_MODAL_WIDTH } from '../../utils/layout';
import useEscape from '../../hooks/useEscape';
import useRetainWhileClosing from '../../hooks/useRetainWhileClosing';
import Mono from '../common/Mono';
import PartialFailureAlert from '../common/PartialFailureAlert';
import CopyFooter from './CopyFooter';
import CopyToolbar from './CopyToolbar';
import SourceRow from './SourceRow';
import TargetRow from './TargetRow';
import useCopyDialogState from './useCopyDialogState';
import type { Copyable } from './useCopyDialogState';
import styles from './CopyModal.module.css';

interface CopyDialogProps {
  request: CopyRequest;
  open: boolean;
  afterClose: () => void;
}

// The dialog once the source is known. It stays mounted when the user picks
// another source, so the selection carries over.
const CopyForm = ({
  copyable,
  setName,
  request,
  open,
  afterClose
}: CopyDialogProps & {
  copyable: Copyable;
  setName: (name: string) => void;
}) => {
  const { source } = copyable;
  const state = useCopyDialogState(copyable, request.preselectTargets, setName);
  const { copying, selected, outcome, picked, errors } = state;

  const close = () => {
    if (!copying) uiActions.closeCopy();
  };
  useEscape(close, open);

  return (
    <Modal
      open={open}
      afterClose={afterClose}
      width={COPY_MODAL_WIDTH}
      style={{
        top: COPY_MODAL_TOP,
        maxWidth: 'calc(100% - var(--ant-margin) * 2)'
      }}
      styles={{
        container: {
          display: 'flex',
          flexDirection: 'column',
          maxHeight: `calc(100vh - ${COPY_MODAL_TOP}px - var(--ant-margin-xl))`
        },
        body: { flex: 1, minHeight: 0, overflowY: 'auto' }
      }}
      title={
        <div className={styles.header}>
          <div>Synchronize environments</div>
          <Mono type="secondary" size="small" className={styles.sourceName}>
            {source.Name}
          </Mono>
        </div>
      }
      closable={!copying}
      mask={{ closable: !copying }}
      // Esc goes through useEscape, so it doesn't also close the pane.
      keyboard={false}
      onCancel={close}
      footer={
        <CopyFooter
          count={selected.length}
          summary={state.summary}
          okText={state.okText}
          canCopy={state.canCopy}
          copying={copying}
          onCancel={close}
          onCopy={() => void state.copy(selected)}
        />
      }
    >
      <Flex vertical gap="var(--ant-margin-sm)">
        <SourceRow
          copyable={copyable}
          onChangeSource={state.changeSource}
          pickSource={request.pickSource}
          disabled={copying}
        />
        {outcome && (
          <PartialFailureAlert
            verb="Copied to"
            done={outcome.copied}
            total={outcome.total}
            onRetry={() =>
              void state.copy(outcome.failed.filter(t => t.status !== 'same'))
            }
            retryLabel="Retry"
            retryDisabled={copying}
          />
        )}
        <CopyToolbar
          allState={state.allState}
          onSelectAll={state.selectAll}
          selected={selected.length}
          selectable={state.selectable.length}
          filtering={state.filtering}
          filter={state.filter}
          onFilter={state.setFilter}
          disabled={copying}
        />
        {state.listed.length ? (
          <ul className={styles.list} aria-label="Environments">
            {state.listed.map(target => (
              <TargetRow
                key={target.segment}
                source={source}
                target={target}
                selected={
                  target.status !== 'same' && picked.has(target.segment)
                }
                onToggle={() => state.toggle(target.segment)}
                kmsKey={state.kmsKeyOf(target)}
                onKmsKey={key => state.setKmsKey(target.segment, key)}
                error={errors.get(target.segment)}
                disabled={copying}
              />
            ))}
          </ul>
        ) : (
          <Typography.Text type="secondary" className={styles.empty}>
            No environments match
          </Typography.Text>
        )}
      </Flex>
    </Modal>
  );
};

// The dialog for one opening. It holds the source, so it is rendered with
// key={request.id} and starts afresh each time.
const CopyDialog = ({ request, open, afterClose }: CopyDialogProps) => {
  const [name, setName] = useState(request.source);
  const copyable = useCopyTargets(name);

  // The parameter was deleted or moved out of the structure.
  const gone = open && !copyable;
  useEffect(() => {
    if (gone) uiActions.closeCopy();
  }, [gone]);

  if (!copyable) {
    return <Modal open={false} afterClose={afterClose} footer={null} />;
  }
  return (
    <CopyForm
      copyable={copyable}
      setName={setName}
      request={request}
      open={open}
      afterClose={afterClose}
    />
  );
};

// Copies a parameter's value to other environments of its service (see
// uiActions.openCopyDialog).
const CopyModal = () => {
  const request = useUiStore(state => state.copyRequest);
  // Kept while the dialog fades out after it closes.
  const [shown, clearShown] = useRetainWhileClosing(request);

  return (
    shown && (
      <CopyDialog
        key={shown.id}
        request={shown}
        open={request === shown}
        afterClose={clearShown}
      />
    )
  );
};

export default CopyModal;
