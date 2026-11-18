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
import HintText from '../common/HintText';
import MetaText from '../common/MetaText';

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
      <HintText type="danger">
        <CloseCircleFilled /> This environment stores it as a {parameter?.Type},
        so the secret will be saved unencrypted.
      </HintText>
    );
  }
  if (isEncrypted(source, target)) {
    return (
      <HintText>
        <InfoCircleOutlined /> This environment stores it as a SecureString, so
        the value will be encrypted with{' '}
        <Mono small>{parameter?.KeyId ?? DEFAULT_KMS_KEY}</Mono>.
      </HintText>
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
        <Tag color={tag.color}>{tag.label}</Tag>
        {keepsType && (
          <Tag icon={isSecureType(targetType) ? <LockOutlined /> : undefined}>
            Keeps {targetType}
          </Tag>
        )}
      </div>
      <div className={styles.details}>
        <div className={styles.current}>
          <MetaText>Current</MetaText>
          {parameter ? (
            <MaskedValue
              value={parameter.Value}
              secure={isSecureType(targetType)}
              small
              ellipsis
              className={styles.currentValue}
            />
          ) : (
            <MetaText>{NOT_SET_LABEL}</MetaText>
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
            <MetaText>{KMS_KEY_LABEL}</MetaText>
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
        {error && <HintText type="danger">{error}</HintText>}
      </div>
    </li>
  );
};

export default TargetRow;
