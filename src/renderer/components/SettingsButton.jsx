import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { Button, Form, Input, Modal, Tooltip } from 'antd';
import { QuestionCircleOutlined, SettingOutlined } from '@ant-design/icons';
import { availableSettings, getSetting, saveSettings } from '../settings';
import { feedback } from '../feedback';

const formItemLayout = {
  labelCol: { span: 6 },
  wrapperCol: { span: 14 }
};
const buttonItemLayout = {
  wrapperCol: { span: 14, offset: 4 }
};
const required = [{ required: true, message: 'Please provide a value.' }];

const labelWithHelp = (label, help) => (
  <span>
    {label}&nbsp;
    <Tooltip title={help}>
      <QuestionCircleOutlined />
    </Tooltip>
  </span>
);

const SettingsForm = ({ onSaved }) => {
  // Read when the modal opens, so the form always shows the current settings.
  const [initialValues] = useState(() =>
    Object.fromEntries(
      Object.values(availableSettings).map(key => [key, getSetting(key)])
    )
  );

  const handleSubmit = values =>
    // set the whole object at once.
    saveSettings(values)
      .then(() => {
        feedback.message.success('Settings were saved.');
        onSaved();
      })
      .catch(saveError => {
        feedback.message.error(
          `Something went wrong while saving settings: ${saveError.message}`
        );
      });

  return (
    <Form
      name="settings"
      initialValues={initialValues}
      onFinish={handleSubmit}
      {...formItemLayout}
    >
      <Form.Item
        label={labelWithHelp(
          'Path Delimiter',
          "If the typical parameter looks like this: 'path-to-parameter-value', the delimiter would be '-'. The recommended path delimiter is '/'."
        )}
        name={availableSettings.pathDelimiter}
        rules={required}
      >
        <Input placeholder="/" />
      </Form.Item>
      <Form.Item
        label="AWS SSM Region"
        name={availableSettings.ssmRegion}
        rules={required}
      >
        <Input placeholder="eu-west-1" />
      </Form.Item>
      <Form.Item
        label="AWS KMS Region"
        name={availableSettings.kmsRegion}
        rules={required}
      >
        <Input placeholder="eu-west-1" />
      </Form.Item>
      <Form.Item
        label={labelWithHelp(
          'AWS Profile',
          'Leave empty to use the default profile. A changed profile is used for the next refresh.'
        )}
        name={availableSettings.profile}
      >
        <Input placeholder="" />
      </Form.Item>
      <Form.Item {...buttonItemLayout}>
        <Button type="primary" htmlType="submit">
          Save
        </Button>
      </Form.Item>
    </Form>
  );
};

SettingsForm.propTypes = {
  onSaved: PropTypes.func.isRequired
};

const SettingsButton = () => {
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);

  return (
    <div>
      <Button icon={<SettingOutlined />} onClick={() => setOpen(true)} />
      {open && (
        <Modal
          width={700}
          title="Settings"
          open
          onCancel={close}
          footer={[
            <Button key="close" onClick={close}>
              Close
            </Button>
          ]}
        >
          <SettingsForm onSaved={close} />
        </Modal>
      )}
    </div>
  );
};

export default SettingsButton;
