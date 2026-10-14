import React, { useId, useState } from 'react';
import PropTypes from 'prop-types';
import { App, Button, Flex, Form, Input, Typography } from 'antd';
import { InfoCircleOutlined } from '@ant-design/icons';
import { useDispatch, useSelector } from 'react-redux';
import { actions as parameterActions } from '../../ducks/parameters';
import { selectors as settingsSelectors } from '../../ducks/settings';
import { leafOf } from '../../utils/paths';
import { isValueValid, MAX_VALUE_LENGTH } from '../../utils/newParameter';
import { isSubmitShortcut } from '../../utils/keys';
import styles from './ValueEditor.module.css';

// Inline edit of the value and description. The name, type and KMS key
// can't be changed here.
const ValueEditor = ({ parameter, onDone }) => {
  const dispatch = useDispatch();
  const { notification } = App.useApp();
  const delimiter = useSelector(settingsSelectors.getPathDelimiter);
  const [value, setValue] = useState(parameter.Value || '');
  const [description, setDescription] = useState(parameter.Description || '');
  const [saving, setSaving] = useState(false);
  const id = useId();
  const canSave = isValueValid(value) && !saving;

  const save = () => {
    if (!canSave) return;
    setSaving(true);
    dispatch(
      parameterActions.createGenericParameter(
        {
          name: parameter.Name,
          type: parameter.Type,
          kmsKey: parameter.KeyId,
          value,
          description
        },
        true
      )
    )
      .then(result => {
        notification.success({
          message: 'Parameter saved',
          description: `${leafOf(parameter.Name, delimiter)} · version ${result.version}`
        });
        onDone();
      })
      .catch(err => {
        setSaving(false);
        notification.error({
          message: 'Parameter was not saved',
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

ValueEditor.propTypes = {
  onDone: PropTypes.func.isRequired,
  parameter: PropTypes.shape({
    Description: PropTypes.string,
    KeyId: PropTypes.string,
    Name: PropTypes.string.isRequired,
    Type: PropTypes.string.isRequired,
    Value: PropTypes.string,
    Version: PropTypes.number
  }).isRequired
};

export default ValueEditor;
