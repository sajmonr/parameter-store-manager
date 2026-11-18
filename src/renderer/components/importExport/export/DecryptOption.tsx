import { Alert, Flex } from 'antd';
import LabeledSwitch from '../../common/LabeledSwitch';

// Whether SecureString values are decrypted into the file, with what each
// choice means.
const DecryptOption = ({
  checked,
  onChange,
  canImport,
  disabled
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  // Whether the format can be imported back.
  canImport: boolean;
  disabled: boolean;
}) => (
  <Flex vertical gap="var(--ant-margin-sm)">
    <LabeledSwitch
      id="export-decrypt"
      checked={checked}
      disabled={disabled}
      onChange={onChange}
    >
      Decrypt SecureString values
    </LabeledSwitch>
    {checked && (
      <Alert
        type="warning"
        showIcon
        title="SecureString values are exported as plain text"
        description="The file holds decrypted secrets. Keep it somewhere safe and delete it when you no longer need it."
      />
    )}
    {!checked && canImport && (
      <Alert
        type="info"
        showIcon
        title="Without decryption, SecureString values are left out of the file. Those parameters will be skipped on import."
      />
    )}
  </Flex>
);

export default DecryptOption;
