import type { ReactNode } from 'react';
import { Tooltip } from 'antd';
import { isSecure } from '../../../../shared/parameterTypes';
import type { ParameterEntry } from '../../../state/parameters';
import { uiActions } from '../../../state/ui';
import { cx } from '../../../utils/classNames';
import { isActivateKey } from '../../../utils/keys';
import CopyButton from '../../common/CopyButton';
import MaskedValue from '../../common/MaskedValue';
import RevealButton from '../../common/RevealButton';
import SecureLockIcon from '../../common/SecureLockIcon';
import styles from '../CompareGrid.module.css';

interface ValueCellProps {
  env: string;
  parameter: ParameterEntry;
  unreadable: boolean;
  selected: boolean;
  revealed: boolean;
}

// The key's value in one environment. Clicking it opens the parameter;
// revealing a SecureString or copying the value doesn't.
const CompareValueCell = ({
  env,
  parameter,
  unreadable,
  selected,
  revealed
}: ValueCellProps) => {
  const { Name, Value } = parameter;
  const secure = isSecure(parameter);
  let value: ReactNode;
  if (unreadable) {
    value = (
      <Tooltip
        title={
          secure
            ? `Can't decrypt the value in ${env}`
            : `The value in ${env} didn't load`
        }
      >
        <span className={styles.unreadable}>
          {secure ? "Can't decrypt" : 'Not loaded'}
        </span>
      </Tooltip>
    );
  } else {
    // A masked value isn't put in the tooltip either.
    value = (
      <Tooltip title={secure && !revealed ? undefined : Value}>
        <MaskedValue
          value={Value}
          secure={secure}
          revealed={revealed}
          size="small"
          ellipsis
          className={styles.value}
        />
      </Tooltip>
    );
  }

  return (
    <div
      role="cell"
      className={cx(styles.cell, styles.present, selected && styles.selected)}
      tabIndex={0}
      onClick={() => uiActions.selectParameter(Name)}
      onKeyDown={event => {
        // Not from the buttons inside.
        if (event.target !== event.currentTarget) return;
        if (!isActivateKey(event)) return;
        event.preventDefault();
        uiActions.selectParameter(Name);
      }}
    >
      {value}
      <span className={styles.actions}>
        {secure && <SecureLockIcon />}
        {secure && Value !== undefined && (
          <RevealButton
            revealed={revealed}
            onToggle={() => uiActions.toggleReveal(Name)}
          />
        )}
        {!unreadable && <CopyButton text={Value} />}
      </span>
    </div>
  );
};

export default CompareValueCell;
