import { Checkbox, Flex, Tag, Typography } from 'antd';
import {
  CloseCircleFilled,
  InfoCircleOutlined,
  LockOutlined
} from '@ant-design/icons';
import { DEFAULT_KMS_KEY, isSecureType } from '../../../shared/parameterTypes';
import type { ParameterEntry } from '../../state/parameters';
import { isEncrypted, isUnencrypted } from '../../utils/copyValue';
import type { CopyStatus, CopyTarget } from '../../utils/copyValue';
import { cx } from '../../utils/classNames';
import { KMS_KEY_LABEL, NOT_SET_LABEL } from '../../utils/labels';
import EnvironmentDot from '../common/EnvironmentDot';
import MaskedValue from '../common/MaskedValue';
import Mono from '../common/Mono';
import KmsKeySelect from '../form/KmsKeySelect';
import styles from './CopyModal.module.css';

const STATUS_TAGS: Record<CopyStatus, { color?: string; label: string }> = {
  new: { color: 'green', label: 'New' },
  overwrites: { color: 'gold', label: 'Overwrites' },
  same: { label: 'Same value' }
};

// What the target's own type does to the copied value.
const TargetTypeNotes = ({
  source,
  target
}: {
  source: ParameterEntry;
  target: CopyTarget;
}) => {
  const { parameter } = target;
  if (isUnencrypted(source, target)) {
    return (
      <Typography.Text type="danger" className={styles.note}>
        <CloseCircleFilled /> This environment stores it as a {parameter?.Type},
        so the secret will be saved unencrypted.
      </Typography.Text>
    );
  }
  if (isEncrypted(source, target)) {
    return (
      <Typography.Text type="secondary" className={styles.note}>
        <InfoCircleOutlined /> This environment stores it as a SecureString, so
        the value will be encrypted with{' '}
        <Mono small>{parameter?.KeyId ?? DEFAULT_KMS_KEY}</Mono>.
      </Typography.Text>
    );
  }
  return null;
};

interface TargetRowProps {
  source: ParameterEntry;
  target: CopyTarget;
  selected: boolean;
  onToggle: () => void;
  kmsKey: string;
  onKmsKey: (key: string) => void;
  error: string | undefined;
  disabled: boolean;
}

// One environment: whether the copy creates or overwrites its parameter,
// its current value, and what its type does to the copy.
const TargetRow = ({
  source,
  target,
  selected,
  onToggle,
  kmsKey,
  onKmsKey,
  error,
  disabled
}: TargetRowProps) => {
  const { segment, color, parameter, status } = target;
  const same = status === 'same';
  const sourceType = source.Type;
  const targetType = parameter?.Type;
  const keepsType = !!parameter && targetType !== sourceType;
  const tag = STATUS_TAGS[status];
  const toggle = () => {
    if (!same && !disabled) onToggle();
  };

  return (
    <li
      className={cx(styles.row, same && styles.same, selected && styles.picked)}
      onClick={toggle}
    >
      <div className={styles.rowMain}>
        <Checkbox
          checked={selected}
          disabled={same || disabled}
          aria-label={segment}
          // The row toggles it.
          onClick={event => event.stopPropagation()}
          onChange={toggle}
        />
        <EnvironmentDot color={color} />
        <Typography.Text strong className={styles.envName}>
          {segment}
        </Typography.Text>
        <Tag color={tag.color} className={styles.tag}>
          {tag.label}
        </Tag>
        {keepsType && (
          <Tag
            className={styles.tag}
            icon={isSecureType(targetType) ? <LockOutlined /> : undefined}
          >
            Keeps {targetType}
          </Tag>
        )}
      </div>
      <div className={styles.details}>
        <div className={styles.current}>
          <Typography.Text type="secondary">Current</Typography.Text>
          {parameter ? (
            <MaskedValue
              value={parameter.Value}
              secure={isSecureType(targetType)}
              small
              ellipsis
              className={styles.currentValue}
            />
          ) : (
            <Typography.Text type="secondary">{NOT_SET_LABEL}</Typography.Text>
          )}
        </div>
        {!same && <TargetTypeNotes source={source} target={target} />}
        {status === 'new' && selected && isSecureType(sourceType) && (
          <Flex
            align="center"
            gap={8}
            className={styles.kms}
            // Picking a key doesn't toggle the row.
            onClick={event => event.stopPropagation()}
          >
            <Typography.Text type="secondary">{KMS_KEY_LABEL}</Typography.Text>
            <KmsKeySelect
              size="small"
              value={kmsKey}
              onChange={onKmsKey}
              include={source.KeyId ? [source.KeyId] : []}
              disabled={disabled}
              aria-label={`KMS key for ${segment}`}
              className={styles.kmsSelect}
            />
          </Flex>
        )}
        {error && (
          <Typography.Text type="danger" className={styles.note}>
            {error}
          </Typography.Text>
        )}
      </div>
    </li>
  );
};

export default TargetRow;
