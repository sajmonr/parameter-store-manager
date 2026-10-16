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
const MaskedValue = ({
  value,
  secure,
  revealed,
  ...rest
}: MaskedValueProps) => {
  if (value === undefined) {
    return (
      <Mono type="secondary" {...rest}>
        …
      </Mono>
    );
  }
  return <Mono {...rest}>{secure && !revealed ? MASK : value}</Mono>;
};

export default MaskedValue;
