import { useEffect, useState } from 'react';
import {
  Alert,
  App,
  Button,
  Checkbox,
  Flex,
  Input,
  Modal,
  Select,
  Tag,
  Typography
} from 'antd';
import {
  CloseCircleFilled,
  InfoCircleOutlined,
  LockOutlined,
  SearchOutlined,
  WarningFilled
} from '@ant-design/icons';
import {
  DEFAULT_KMS_KEY,
  isEditableType
} from '../../../main/endpoints/parameters/putParameter/putParameter.contract';
import { useCopyValue, useParameters } from '../../state/parameters';
import type { ParameterEntry } from '../../state/parameters';
import { usePathDelimiter } from '../../state/settings';
import { uiActions, useUiStore } from '../../state/ui';
import type { CopyRequest } from '../../state/ui';
import { useCopyTargets } from '../../state/views';
import { copyRequest, copySummary, isUnencrypted } from '../../utils/copyValue';
import type { CopyStatus, CopyTarget } from '../../utils/copyValue';
import { leafOf } from '../../utils/paths';
import { plural } from '../../utils/plural';
import useEscape from '../../hooks/useEscape';
import EnvironmentDot from '../common/EnvironmentDot';
import MaskedValue from '../common/MaskedValue';
import Mono from '../common/Mono';
import ParameterTypeTag from '../common/ParameterTypeTag';
import KmsKeySelect from '../form/KmsKeySelect';
import styles from './CopyModal.module.css';

// With more other environments than this, the list can be filtered.
const FILTER_THRESHOLD = 5;

const STATUS_TAGS: Record<CopyStatus, { color?: string; label: string }> = {
  new: { color: 'green', label: 'New' },
  overwrites: { color: 'gold', label: 'Overwrites' },
  same: { label: 'Same value' }
};

const cx = (...classes: (string | false | null | undefined)[]) =>
  classes.filter(Boolean).join(' ');

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
            icon={targetType === 'SecureString' ? <LockOutlined /> : undefined}
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
              secure={targetType === 'SecureString'}
              size={12}
              ellipsis
              className={styles.currentValue}
            />
          ) : (
            <Typography.Text type="secondary">Not set</Typography.Text>
          )}
        </div>
        {!same && isUnencrypted(source, target) && (
          <Typography.Text type="danger" className={styles.note}>
            <CloseCircleFilled /> This environment stores it as a {targetType},
            so the secret will be saved unencrypted.
          </Typography.Text>
        )}
        {!same && sourceType === 'String' && targetType === 'SecureString' && (
          <Typography.Text type="secondary" className={styles.note}>
            <InfoCircleOutlined /> This environment stores it as a SecureString,
            so the value will be encrypted with{' '}
            <Mono size={12}>{parameter?.KeyId ?? DEFAULT_KMS_KEY}</Mono>.
          </Typography.Text>
        )}
        {status === 'new' && selected && sourceType === 'SecureString' && (
          <Flex
            align="center"
            gap={8}
            className={styles.kms}
            // Picking a key doesn't toggle the row.
            onClick={event => event.stopPropagation()}
          >
            <Typography.Text type="secondary">KMS key</Typography.Text>
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

interface Outcome {
  copied: number;
  total: number;
  // The targets that failed, to retry.
  failed: CopyTarget[];
}

interface SourceOption {
  segment: string;
  color: string;
  // The key's name in this environment, and its type there.
  name: string;
  type: string | undefined;
}

interface SourcePickerProps {
  // The environments that have the key. A type the app can't save is listed
  // but can't be picked.
  options: SourceOption[];
  value: string;
  onChange: (name: string) => void;
  // Asks the user to check the source.
  highlight: boolean;
  disabled: boolean;
}

// The source environment, when more than one has the key.
const SourcePicker = ({
  options,
  value,
  onChange,
  highlight,
  disabled
}: SourcePickerProps) => {
  const color = options.find(o => o.name === value)?.color;
  return (
    <Select
      value={value}
      onChange={onChange}
      disabled={disabled}
      aria-label="Source environment"
      prefix={color && <EnvironmentDot color={color} />}
      popupMatchSelectWidth={false}
      className={cx(styles.sourcePicker, highlight && styles.highlight)}
      options={options.map(({ segment, color: dot, name, type }) => ({
        value: name,
        label: segment,
        dot,
        unsupported: isEditableType(type) ? null : type,
        disabled: !isEditableType(type)
      }))}
      optionRender={({ data }) => (
        <span className={styles.sourceOption}>
          <EnvironmentDot color={data.dot} />
          {data.label}
          {data.unsupported && (
            <Typography.Text type="secondary" className={styles.unsupported}>
              {data.unsupported} not supported
            </Typography.Text>
          )}
        </span>
      )}
    />
  );
};

interface CopyDialogProps {
  request: CopyRequest;
  open: boolean;
  afterClose: () => void;
}

// The dialog for one opening. It holds the source and the selection, so it
// is rendered with key={request.id} and starts afresh each time.
const CopyDialog = ({ request, open, afterClose }: CopyDialogProps) => {
  const { notification } = App.useApp();
  const delimiter = usePathDelimiter();
  const [name, setName] = useState(request.source);
  const copyable = useCopyTargets(name);
  const { byName } = useParameters();
  const copyValue = useCopyValue();
  const [picked, setPicked] = useState<ReadonlySet<string>>(
    () => new Set(request.preselectTargets)
  );
  // A Map, not an object: an environment may be named `constructor`.
  const [kmsKeys, setKmsKeys] = useState<ReadonlyMap<string, string>>(
    new Map()
  );
  const [filter, setFilter] = useState('');
  const [errors, setErrors] = useState<ReadonlyMap<string, string>>(new Map());
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const [progress, setProgress] = useState<{ done: number; total: number }>();
  const copying = copyValue.isPending;

  const close = () => {
    if (!copying) uiActions.closeCopy();
  };
  useEscape(close, open);

  // The parameter was deleted or moved out of the structure.
  const gone = open && !copyable;
  useEffect(() => {
    if (gone) uiActions.closeCopy();
  }, [gone]);

  if (!copyable) {
    return <Modal open={false} afterClose={afterClose} footer={null} />;
  }

  const { source, place, targets } = copyable;
  const secure = source.Type === 'SecureString';
  const supported = isEditableType(source.Type);
  const canCopy = supported && source.Value !== undefined;
  const defaultKey = source.KeyId ?? DEFAULT_KMS_KEY;
  const selectable = targets.filter(t => t.status !== 'same');
  // A target that got the value since it was picked is no longer selected.
  const selected = selectable.filter(t => picked.has(t.segment));
  const filtering = targets.length > FILTER_THRESHOLD;
  const query = filtering ? filter.trim().toLowerCase() : '';
  const listed = targets.filter(t => t.segment.toLowerCase().includes(query));
  const listedSelectable = listed.filter(t => t.status !== 'same');
  const listedSelected = listedSelectable.filter(t => picked.has(t.segment));

  // Another environment's value: the old source becomes a target, the new
  // one isn't, and the key defaults follow the new source's key.
  const changeSource = (next: string) => {
    const env = place.environments.find(e => e.name === next);
    if (!env || next === name) return;
    setName(next);
    setPicked(current => {
      const without = new Set(current);
      without.delete(env.segment);
      return without;
    });
    setKmsKeys(new Map());
    setErrors(new Map());
    setOutcome(null);
  };

  const toggle = (segment: string) =>
    setPicked(current => {
      const next = new Set(current);
      if (!next.delete(segment)) next.add(segment);
      return next;
    });

  const selectAll = (checked: boolean) =>
    setPicked(current => {
      const next = new Set(current);
      listedSelectable.forEach(t =>
        checked ? next.add(t.segment) : next.delete(t.segment)
      );
      return next;
    });

  const copy = async (rows: CopyTarget[]) => {
    if (!rows.length || !canCopy) return;
    setErrors(new Map());
    setOutcome(null);
    setProgress({ done: 0, total: rows.length });
    const result = await copyValue.mutateAsync({
      requests: rows.map(target =>
        copyRequest(source, target, kmsKeys.get(target.segment) ?? defaultKey)
      ),
      onDone: () =>
        setProgress(
          current => current && { ...current, done: current.done + 1 }
        )
    });
    setProgress(undefined);

    const failed = rows.filter(t => result.failed.has(t.name));
    if (!failed.length) {
      notification.success({
        title: `Copied to ${plural(rows.length, 'environment')}`,
        description: `${leafOf(source.Name, delimiter)} → ${rows.map(t => t.segment).join(', ')}`
      });
      uiActions.closeCopy();
      return;
    }
    setPicked(new Set(failed.map(t => t.segment)));
    setErrors(
      new Map(failed.map(t => [t.segment, result.failed.get(t.name)!]))
    );
    setOutcome({ copied: result.copied.length, total: rows.length, failed });
  };

  const summary = copySummary(source, selected);
  const count = selected.length;
  let okText = 'Copy';
  if (progress) {
    okText = `Copying ${Math.min(progress.done + 1, progress.total)} of ${progress.total}…`;
  } else if (count) {
    okText = `Copy to ${plural(count, 'environment')}`;
  }

  const sourceEnv = place.environments.find(e => e.state === 'current')!;
  const sources = place.environments.flatMap(e =>
    e.state === 'missing' ? [] : [{ ...e, type: byName.get(e.name)?.Type }]
  );

  return (
    <Modal
      open={open}
      afterClose={afterClose}
      width={640}
      style={{ top: 80, maxWidth: 'calc(100% - 32px)' }}
      styles={{
        container: {
          display: 'flex',
          flexDirection: 'column',
          maxHeight: 'calc(100vh - 112px)'
        },
        body: { flex: 1, minHeight: 0, overflowY: 'auto' }
      }}
      title={
        <div className={styles.header}>
          <div>Copy to environments</div>
          <Mono type="secondary" size={12} className={styles.sourceName}>
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
        <div className={styles.footer}>
          <div className={styles.summary}>
            {count ? (
              <Typography.Text>
                {summary.overwrites > 0 && (
                  <WarningFilled className={styles.overwriteIcon} />
                )}
                {summary.text}
              </Typography.Text>
            ) : (
              <Typography.Text type="secondary">
                Select the environments to copy to
              </Typography.Text>
            )}
            <Typography.Text type="secondary" className={styles.hint}>
              Only the value is copied. Types and descriptions in the targets
              stay as they are.
            </Typography.Text>
          </div>
          <Flex gap={8} className={styles.buttons}>
            <Button onClick={close} disabled={copying}>
              Cancel
            </Button>
            <Button
              type="primary"
              disabled={!count || !canCopy}
              loading={copying}
              onClick={() => void copy(selected)}
            >
              {okText}
            </Button>
          </Flex>
        </div>
      }
    >
      <Flex vertical gap={12}>
        <div className={styles.source}>
          <Typography.Text type="secondary">From</Typography.Text>
          {sources.length > 1 ? (
            <SourcePicker
              options={sources}
              value={name}
              onChange={changeSource}
              highlight={request.pickSource}
              disabled={copying}
            />
          ) : (
            <Tag color={sourceEnv.color} variant="solid" className={styles.tag}>
              {sourceEnv.segment}
            </Tag>
          )}
          <MaskedValue
            value={source.Value}
            secure={secure}
            ellipsis
            className={styles.sourceValue}
          />
          <ParameterTypeTag type={source.Type} />
        </div>
        {!supported && (
          <Typography.Text type="danger" className={styles.pickHint}>
            <CloseCircleFilled /> {source.Type} values can&apos;t be copied yet.
            Choose another environment.
          </Typography.Text>
        )}
        {request.pickSource && (
          <Typography.Text type="secondary" className={styles.pickHint}>
            <InfoCircleOutlined className={styles.pickIcon} /> Choose which
            environment to copy the value from.
          </Typography.Text>
        )}
        {outcome && (
          <Alert
            type="error"
            showIcon
            title={`Copied to ${outcome.copied} of ${outcome.total}. ${outcome.failed.length} failed.`}
            action={
              <Button
                size="small"
                disabled={copying}
                onClick={() =>
                  void copy(outcome.failed.filter(t => t.status !== 'same'))
                }
              >
                Retry
              </Button>
            }
          />
        )}
        <Flex align="center" gap={12} className={styles.toolbar}>
          <Checkbox
            checked={
              listedSelectable.length > 0 &&
              listedSelected.length === listedSelectable.length
            }
            indeterminate={
              listedSelected.length > 0 &&
              listedSelected.length < listedSelectable.length
            }
            disabled={!listedSelectable.length || copying}
            onChange={event => selectAll(event.target.checked)}
          >
            Select all
          </Checkbox>
          <Typography.Text type="secondary">
            {count} of {plural(selectable.length, 'environment')} selected
          </Typography.Text>
          {filtering && (
            <Input
              allowClear
              size="small"
              prefix={<SearchOutlined />}
              placeholder="Filter environments"
              aria-label="Filter environments"
              value={filter}
              onChange={event => setFilter(event.target.value)}
              className={styles.filter}
            />
          )}
        </Flex>
        {listed.length ? (
          <ul className={styles.list} aria-label="Environments">
            {listed.map(target => (
              <TargetRow
                key={target.segment}
                source={source}
                target={target}
                selected={
                  target.status !== 'same' && picked.has(target.segment)
                }
                onToggle={() => toggle(target.segment)}
                kmsKey={kmsKeys.get(target.segment) ?? defaultKey}
                onKmsKey={key =>
                  setKmsKeys(current =>
                    new Map(current).set(target.segment, key)
                  )
                }
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

// Copies a parameter's value to other environments of its service (see
// uiActions.openCopyDialog).
const CopyModal = () => {
  const request = useUiStore(state => state.copyRequest);
  // Kept while the dialog fades out after it closes.
  const [shown, setShown] = useState(request);
  if (request && request !== shown) setShown(request);

  return (
    shown && (
      <CopyDialog
        key={shown.id}
        request={shown}
        open={request === shown}
        afterClose={() => setShown(null)}
      />
    )
  );
};

export default CopyModal;
