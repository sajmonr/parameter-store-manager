import { useState } from 'react';
import type { ReactNode } from 'react';
import { Tag, Tooltip, Typography, Flex } from 'antd';
import { ArrowRightOutlined } from '@ant-design/icons';
import { isSecureType } from '../../../../shared/parameterTypes';
import type { ImportRow } from '../../../utils/importPlan';
import { kmsKeyName } from '../../../utils/kms';
import { KMS_KEY_LABEL } from '../../../utils/labels';
import { cx } from '../../../utils/classNames';
import MaskedValue from '../../common/MaskedValue';
import Mono from '../../common/Mono';
import RevealButton from '../../common/RevealButton';
import SecureLockIcon from '../../common/SecureLockIcon';
import { STATUSES } from './importStatuses';
import styles from '../ImportReview.module.css';
import MetaText from '../../common/MetaText';

// One field of a row: its new value, after the old one when it changes.
// An empty value shows as "none"; an old value that didn't load (null)
// shows as "…", as in the table.
const FieldChange = ({
  label,
  from,
  to,
  secure = false,
  revealed = false,
  action
}: {
  label: string;
  from?: string | null;
  to: string;
  secure?: boolean;
  revealed?: boolean;
  action?: ReactNode;
}) => {
  const show = (text: string | null, old: boolean) =>
    text === null || text ? (
      // MaskedValue shows "…" for undefined.
      <MaskedValue
        value={text ?? undefined}
        secure={secure}
        revealed={revealed}
        ellipsis={{
          tooltip: (secure && !revealed) || text === null ? undefined : text
        }}
        type={old ? 'secondary' : undefined}
        delete={old}
        className={styles.value}
      />
    ) : (
      <Typography.Text type="secondary" italic className={styles.value}>
        none
      </Typography.Text>
    );
  return (
    <>
      <MetaText>{label}</MetaText>
      <Flex
        component="span"
        align="center"
        gap="small"
        className={styles.change}
      >
        {from !== undefined && (
          <>
            {show(from, true)}
            <ArrowRightOutlined className={styles.arrow} aria-label="to" />
          </>
        )}
        {show(to, false)}
        {action}
      </Flex>
    </>
  );
};

// What a new or changed entry would write: the value of a new one, and the
// fields that change of a changed one.
const RowDetails = ({ row }: { row: ImportRow }) => {
  const [revealed, setRevealed] = useState(false);
  const { entry, status, existing, changes } = row;
  const secure = isSecureType(entry.type);
  const reveal = secure ? (
    <RevealButton
      revealed={revealed}
      onToggle={() => setRevealed(shown => !shown)}
    />
  ) : undefined;

  if (status === 'new') {
    return (
      <div className={styles.details}>
        <FieldChange
          label="Value"
          to={entry.value!}
          secure={secure}
          revealed={revealed}
          action={reveal}
        />
      </div>
    );
  }
  if (status !== 'changed' || !existing) return null;
  return (
    <div className={styles.details}>
      {changes.includes('value') && (
        <FieldChange
          label="Value"
          // Missing when its value failed to load.
          from={existing.Value ?? null}
          to={entry.value!}
          secure={secure}
          revealed={revealed}
          action={reveal}
        />
      )}
      {changes.includes('description') && (
        <FieldChange
          label="Description"
          from={existing.Description ?? ''}
          to={entry.description}
        />
      )}
      {changes.includes('keyId') && (
        <FieldChange
          label={KMS_KEY_LABEL}
          from={kmsKeyName(existing.KeyId)}
          to={kmsKeyName(entry.keyId)}
        />
      )}
    </div>
  );
};

// One entry of the file. Entries that won't be written are dimmed; failed
// ones show the AWS error on hover.
const ReviewRow = ({
  row,
  written,
  error
}: {
  row: ImportRow;
  written: boolean;
  error?: string;
}) => {
  const { entry, status } = row;
  const { label, color, tooltip } = STATUSES[status];
  const main = (
    <Flex align="center" gap="small" className={styles.rowMain}>
      <span className={styles.statusColumn}>
        {error ? (
          <Tag color="error">failed</Tag>
        ) : (
          <Tooltip title={tooltip}>
            <Tag color={color}>{label}</Tag>
          </Tooltip>
        )}
      </span>
      <Mono
        ellipsis
        className={styles.name}
        type={error ? 'danger' : undefined}
      >
        {entry.name}
      </Mono>
      {isSecureType(entry.type) && <SecureLockIcon muted />}
    </Flex>
  );
  return (
    <Flex
      component="li"
      vertical
      gap="var(--ant-margin-xxs)"
      className={cx(styles.row, !written && styles.dimmed)}
    >
      {error ? <Tooltip title={error}>{main}</Tooltip> : main}
      <RowDetails row={row} />
    </Flex>
  );
};

export default ReviewRow;
