import { useState } from 'react';
import { App, Flex, Modal, Typography } from 'antd';
import { ExclamationCircleFilled } from '@ant-design/icons';
import { useDeleteParameters } from '../../state/parameters';
import { usePathDelimiter, useSettingsStore } from '../../state/settings';
import { uiActions, useUiStore } from '../../state/ui';
import type { DeleteRequest } from '../../state/ui';
import { useCheckContext } from '../../state/views';
import { describeError } from '../../utils/awsErrors';
import { leafOf } from '../../utils/paths';
import { plural } from '../../utils/plural';
import useEscape from '../../hooks/useEscape';
import Mono from '../common/Mono';
import styles from './DeleteModal.module.css';

const titleOf = ({ kind, label, names }: DeleteRequest, delimiter: string) => {
  if (kind === 'tree') {
    return (
      <>
        Delete <Mono>{label}</Mono> and everything in it?
      </>
    );
  }
  if (kind === 'parameter') {
    return (
      <>
        Delete <Mono>{leafOf(label, delimiter)}</Mono>?
      </>
    );
  }
  return `Delete ${plural(names.length, 'parameter')}?`;
};

// Only names, never values.
const NameList = ({ names }: { names: string[] }) => (
  <ul className={styles.list}>
    {names.map(name => (
      <li key={name}>
        <Mono>{name}</Mono>
      </li>
    ))}
  </ul>
);

// The one confirmation for deleting checked rows, a sidebar tree or the open
// parameter (see uiActions.requestDelete).
const DeleteModal = () => {
  const { message, notification } = App.useApp();
  const request = useUiStore(state => state.pendingDelete);
  const region = useSettingsStore(settings => settings.ssmRegion);
  const delimiter = usePathDelimiter();
  const checkContext = useCheckContext();
  const deleteParameters = useDeleteParameters();
  // Kept while the modal fades out after the request is gone.
  const [shown, setShown] = useState(request);
  if (request && request !== shown) setShown(request);

  const cancel = () => {
    if (!deleteParameters.isPending) uiActions.cancelDelete();
  };
  useEscape(cancel, !!request);

  const confirm = async () => {
    if (!request) return;
    const result = await deleteParameters.mutateAsync(request.names);
    const { deleted, failed, error } = result;
    uiActions.finishDelete(checkContext, result);
    if (deleted.length) {
      message.success(`Deleted ${plural(deleted.length, 'parameter')}`);
    }
    if (failed.length) {
      notification.error({
        title: `${plural(failed.length, 'parameter')} could not be deleted. They are still selected.`,
        description: (
          <>
            {error && describeError(error)}
            <NameList names={failed} />
          </>
        ),
        duration: 0
      });
    }
  };

  const count = shown?.names.length ?? 0;
  return (
    <Modal
      open={!!request}
      title={
        shown && (
          <Flex gap={8} align="baseline">
            <ExclamationCircleFilled className={styles.icon} />
            <span className={styles.title}>{titleOf(shown, delimiter)}</span>
          </Flex>
        )
      }
      okText={`Delete ${plural(count, 'parameter')}`}
      okButtonProps={{ danger: true }}
      confirmLoading={deleteParameters.isPending}
      cancelText="Cancel"
      onOk={confirm}
      onCancel={cancel}
      // Esc goes through useEscape, so it doesn't also close the pane.
      keyboard={false}
    >
      <Typography.Paragraph>
        The following parameters will be permanently deleted from {region}. This
        can&apos;t be undone.
      </Typography.Paragraph>
      {shown && <NameList names={shown.names} />}
    </Modal>
  );
};

export default DeleteModal;
