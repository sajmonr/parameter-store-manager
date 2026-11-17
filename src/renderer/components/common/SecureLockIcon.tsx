import { forwardRef } from 'react';
import { theme, Tooltip } from 'antd';
import { LockOutlined } from '@ant-design/icons';
import { PARAMETER_TYPE } from '../../../shared/parameterTypes';

const LABEL = PARAMETER_TYPE.SecureString;

// Marks a SecureString: in warning colour with a tooltip, or `muted` in
// secondary colour without one, where the row already says more.
const SecureLockIcon = forwardRef<HTMLSpanElement, { muted?: boolean }>(
  ({ muted = false }, ref) => {
    const { token } = theme.useToken();
    const icon = (
      <LockOutlined
        ref={ref}
        aria-label={LABEL}
        style={{
          color: muted ? token.colorTextSecondary : token.colorWarning
        }}
      />
    );
    return muted ? icon : <Tooltip title={LABEL}>{icon}</Tooltip>;
  }
);
SecureLockIcon.displayName = 'SecureLockIcon';

export default SecureLockIcon;
