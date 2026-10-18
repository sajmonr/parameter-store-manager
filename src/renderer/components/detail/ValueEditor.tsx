import { useId, useState } from 'react';
import { App, Button, Flex, Form, Input, Typography } from 'antd';
import { InfoCircleOutlined } from '@ant-design/icons';
import { isEditableType } from '../../../main/endpoints/parameters/putParameter/putParameter.contract';
import { usePutParameter } from '../../state/parameters';
import type { ParameterEntry } from '../../state/parameters';
import { usePathDelimiter } from '../../state/settings';
import { leafOf } from '../../utils/paths';
import { isValueValid, MAX_VALUE_LENGTH } from '../../utils/newParameter';
import { isSubmitShortcut } from '../../utils/keys';
import styles from './ValueEditor.module.css';

// Inline edit of the value and description. The name, type and KMS key
// can't be changed here.
interface ValueEditorProps {
  parameter: ParameterEntry;
  onDone: () => void;
}

const ValueEditor = ({ parameter, onDone }: ValueEditorProps) => {
  const { notification } = App.useApp();
  const delimiter = usePathDelimiter();
  const putParameter = usePutParameter();
  const [value, setValue] = useState(parameter.Value || '');
  const [description, setDescription] = useState(parameter.Description || '');
  const saving = putParameter.isPending;
  const id = useId();
  const canSave = isValueValid(value) && !saving;

  const save = () => {
    // DetailActions only offers editing for these types.
    if (!canSave || !isEditableType(parameter.Type)) return;
    putParameter
      .mutateAsync({
        name: parameter.Name,
        type: parameter.Type,
        kmsKey: parameter.KeyId,
        value,
        description,
        overwrite: true
      })
      .then(result => {
        notification.success({
          title: 'Parameter saved',
          description: `${leafOf(parameter.Name, delimiter)} · version ${result.version}`
        });
        onDone();
      })
      .catch(err => {
        notification.error({
          title: 'Parameter was not saved',
          description: err.message || ''
        });
      });
  };

  return (
    <Form
      layout="vertical"
      className={styles.form}
      onKeyDown={event => {
        if (isSubmitShortcut(event)) save();
      }}
    >
      <Form.Item label="Value" required htmlFor={`${id}-value`}>
        <Input.TextArea
          id={`${id}-value`}
          className={styles.value}
          value={value}
          onChange={event => setValue(event.target.value)}
          autoSize={{ minRows: 4, maxRows: 12 }}
          showCount
          maxLength={MAX_VALUE_LENGTH}
          autoFocus
        />
      </Form.Item>
      <Form.Item label="Description" htmlFor={`${id}-description`}>
        <Input
          id={`${id}-description`}
          value={description}
          onChange={event => setDescription(event.target.value)}
          placeholder="What reads this value?"
        />
      </Form.Item>
      <Flex align="center" gap={8}>
        <Typography.Text type="secondary" className={styles.hint}>
          <InfoCircleOutlined /> Saves as version {(parameter.Version || 0) + 1}
        </Typography.Text>
        <Button onClick={onDone}>Cancel</Button>
        <Button
          type="primary"
          onClick={save}
          disabled={!canSave}
          loading={saving}
        >
          Save
        </Button>
      </Flex>
    </Form>
  );
};

export default ValueEditor;
