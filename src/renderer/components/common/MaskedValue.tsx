import { forwardRef } from 'react';
import Mono from './Mono';
import type { MonoProps } from './Mono';

export const MASK = '••••••••';

type MaskedValueProps = Omit<MonoProps, 'children'> & {
  // Undefined while the value is loading.
  value: string | undefined;
  secure?: boolean;
  revealed?: boolean;
};

// A parameter value; SecureString values stay masked until revealed.
const MaskedValue = forwardRef<HTMLSpanElement, MaskedValueProps>(
  ({ value, secure, revealed, ...rest }, ref) => {
    if (value === undefined) {
      return (
        <Mono ref={ref} type="secondary" {...rest}>
          …
        </Mono>
      );
    }
    return (
      <Mono ref={ref} {...rest}>
        {secure && !revealed ? MASK : value}
      </Mono>
    );
  }
);
MaskedValue.displayName = 'MaskedValue';

export default MaskedValue;
