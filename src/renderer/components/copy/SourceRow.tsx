import { Tag, Typography } from 'antd';
import { CloseCircleFilled, InfoCircleOutlined } from '@ant-design/icons';
import { isEditableType, isSecure } from '../../../shared/parameterTypes';
import { useParameters } from '../../state/parameters';
import { uiActions, useUiStore } from '../../state/ui';
import { sourceEnvironments } from '../../utils/copyValue';
import MaskedValue from '../common/MaskedValue';
import ParameterTypeTag from '../common/ParameterTypeTag';
import RevealButton from '../common/RevealButton';
import SourcePicker from './SourcePicker';
import type { Copyable } from './useCopyDialogState';
import styles from './CopyModal.module.css';

interface SourceRowProps {
  copyable: Copyable;
  onChangeSource: (name: string) => void;
  // Asks the user to check the source: opened to fill a missing value.
  pickSource: boolean;
  disabled: boolean;
}

// Where the value comes from: the environment, picked when several have the
// key, and its value; then why it can't be copied, or a hint to check it.
const SourceRow = ({
  copyable: { source, place },
  onChangeSource,
  pickSource,
  disabled
}: SourceRowProps) => {
  const { byName } = useParameters();
  // Shared with the table and compare, so a value revealed there shows here.
  const revealed = useUiStore(state => state.revealed).has(source.Name);
  const secure = isSecure(source);
  const sourceEnv = place.environments.find(e => e.state === 'current')!;
  const sources = sourceEnvironments(place.environments, byName);

  return (
    <>
      <div className={styles.source}>
        <Typography.Text type="secondary">From</Typography.Text>
        {sources.length > 1 ? (
          <SourcePicker
            options={sources}
            value={source.Name}
            onChange={onChangeSource}
            highlight={pickSource}
            disabled={disabled}
          />
        ) : (
          <Tag color={sourceEnv.color} variant="solid">
            {sourceEnv.segment}
          </Tag>
        )}
        <MaskedValue
          value={source.Value}
          secure={secure}
          revealed={revealed}
          ellipsis={!secure || revealed ? { tooltip: source.Value } : true}
          className={styles.sourceValue}
        />
        {secure && source.Value !== undefined && (
          <RevealButton
            revealed={revealed}
            onToggle={() => uiActions.toggleReveal(source.Name)}
          />
        )}
        <ParameterTypeTag type={source.Type} />
      </div>
      {!isEditableType(source.Type) && (
        <Typography.Text type="danger" className={styles.pickHint}>
          <CloseCircleFilled /> {source.Type} values can&apos;t be copied yet.
          Choose another environment.
        </Typography.Text>
      )}
      {pickSource && (
        <Typography.Text type="secondary" className={styles.pickHint}>
          <InfoCircleOutlined className={styles.pickIcon} /> Choose which
          environment to copy the value from.
        </Typography.Text>
      )}
    </>
  );
};

export default SourceRow;
