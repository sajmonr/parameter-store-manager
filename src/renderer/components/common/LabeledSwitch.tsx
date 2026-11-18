import type { ReactNode } from 'react';
import { Flex, Switch } from 'antd';

interface LabeledSwitchProps {
  // Ties the label to the switch, so clicking it toggles.
  id: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (checked: boolean) => void;
  children: ReactNode;
}

// A switch with its label to the right.
const LabeledSwitch = ({
  id,
  checked,
  disabled,
  onChange,
  children
}: LabeledSwitchProps) => (
  <Flex align="center" gap="small">
    <Switch id={id} checked={checked} disabled={disabled} onChange={onChange} />
    <label htmlFor={id}>{children}</label>
  </Flex>
);

export default LabeledSwitch;
