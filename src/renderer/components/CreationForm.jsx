import React, { useEffect, useId, useState } from 'react';
import PropTypes from 'prop-types';
import { Button, Checkbox, Col, Form, Input, Radio, Row, Select } from 'antd';
import { useDispatch, useSelector } from 'react-redux';
import { formDataShape } from './formDataShape.propType';
import {
  actions as parameterActions,
  selectors as parameterSelectors
} from '../ducks/parameters';
import { feedback } from '../feedback';

const { TextArea } = Input;

const ENVIRONMENTS = ['local', 'fea', 'stg', 'prd', 'common'];
const DEFAULT_ENVIRONMENTS = ['local', 'fea', 'stg', 'prd'];
const NO_SLASHES_OR_WHITESPACE = {
  pattern: /^[^\s\\/]+$/,
  message: 'Whitespace, /, \\ is not allowed.'
};

const previewStyle = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  flexDirection: 'column'
};

const CreationForm = ({ initialFormData = null, editFlow }) => {
  const [form] = Form.useForm();
  // The Add and Edit modals can be mounted at the same time; field ids must not clash.
  const formName = `parameter_creation_${useId().replace(/:/g, '')}`;
  const dispatch = useDispatch();
  const kmsKeyLoaded = useSelector(parameterSelectors.getIsKmsKeyLoaded);
  const kmsKeyLoading = useSelector(parameterSelectors.getIsKmsKeyLoading);
  const kmsKeyLoadError = useSelector(parameterSelectors.getKmsKeyLoadHasError);
  const kmsKeys = useSelector(parameterSelectors.getKmsKeys);

  const [creationType, setCreationType] = useState(
    initialFormData || editFlow ? 'generic' : 'service'
  );
  const [submitting, setSubmitting] = useState(false);

  const type = Form.useWatch('type', form);
  const serviceName = Form.useWatch('serviceName', form);
  const name = Form.useWatch('name', form);
  const environments = Form.useWatch('environments', form) || [];

  useEffect(() => {
    dispatch(parameterActions.fetchKmsKeys());
  }, [dispatch]);

  const handleSubmit = values => {
    const creationFn =
      creationType === 'service'
        ? parameterActions.createServiceParameters
        : parameterActions.createGenericParameter;
    setSubmitting(true);
    dispatch(creationFn(values, !!editFlow))
      .then(() => {
        feedback.notification.success({
          message: editFlow
            ? 'Parameter was saved.'
            : 'Parameter(s) were created.'
        });
      })
      .catch(creationError => {
        feedback.notification.error({
          message: editFlow
            ? 'Parameter was not saved'
            : 'One or more parameters were not created.',
          description: creationError.message || ''
        });
      })
      .finally(() => setSubmitting(false));
  };

  const initial = initialFormData || {};
  const kmsKeyOptions =
    !kmsKeyLoadError && kmsKeyLoaded
      ? kmsKeys.map(key => ({ value: key.AliasName, label: key.AliasName }))
      : [];

  return (
    <div>
      {!editFlow && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          <span className="ant-form-text">Parameter Type: </span>
          <Radio.Group
            buttonStyle="solid"
            onChange={e => setCreationType(e.target.value)}
            value={creationType}
          >
            <Radio.Button value="service">Service</Radio.Button>
            <Radio.Button value="generic">Generic</Radio.Button>
            <Radio.Button value="client" disabled>
              Client
            </Radio.Button>
          </Radio.Group>
        </div>
      )}
      <Form
        form={form}
        name={formName}
        labelCol={{ span: 6 }}
        wrapperCol={{ span: 14 }}
        initialValues={{
          name: initial.name,
          description: initial.description,
          environments: DEFAULT_ENVIRONMENTS,
          type: initial.type || 'String',
          kmsKey: initial.kmsKey,
          value: initial.value
        }}
        onFinish={handleSubmit}
      >
        {creationType === 'service' && (
          <Form.Item
            label="Service Name"
            name="serviceName"
            rules={[
              {
                required: true,
                message: "Please provide the service's name."
              },
              NO_SLASHES_OR_WHITESPACE
            ]}
          >
            <Input placeholder="pricingterm" />
          </Form.Item>
        )}
        <Form.Item
          label="Parameter Name"
          name="name"
          rules={[
            { required: true, message: 'Please provide the parameter name.' },
            ...(creationType === 'service' ? [NO_SLASHES_OR_WHITESPACE] : [])
          ]}
        >
          <Input
            placeholder={
              creationType === 'service'
                ? 'Auth0ClientUrl'
                : '/packages/common/ClientSecretNoPermissions'
            }
            disabled={editFlow}
          />
        </Form.Item>

        <Form.Item label="Description" name="description">
          <Input placeholder="This is used by the integration tests for the parameter store package" />
        </Form.Item>
        {creationType === 'service' && (
          <Form.Item
            label="Environments"
            name="environments"
            rules={[
              {
                required: true,
                message: 'Please select at least one environment',
                type: 'array'
              }
            ]}
          >
            <Checkbox.Group style={{ width: '100%' }}>
              <Row>
                {ENVIRONMENTS.map(env => (
                  <Col span={6} key={env}>
                    <Checkbox value={env}>{env}</Checkbox>
                  </Col>
                ))}
              </Row>
            </Checkbox.Group>
          </Form.Item>
        )}
        <Form.Item
          label="Type"
          name="type"
          rules={[
            { required: true, message: 'Please select the parameter type.' }
          ]}
        >
          <Radio.Group>
            <Radio value="String">String</Radio>
            <Radio value="SecureString">SecureString</Radio>
            <Radio value="StringList" disabled>
              StringList (Not supported yet)
            </Radio>
          </Radio.Group>
        </Form.Item>
        {type === 'SecureString' && (
          <Form.Item
            label="Select KMS Key"
            name="kmsKey"
            hasFeedback
            rules={[
              {
                required: true,
                message:
                  'Please select the KMS Key to encrypt the Secure String.'
              }
            ]}
          >
            <Select
              placeholder="Please select a KMS key"
              loading={kmsKeyLoading}
              showSearch
              optionFilterProp="label"
              options={kmsKeyOptions}
            />
          </Form.Item>
        )}
        <Form.Item
          label="Value"
          name="value"
          rules={[
            { required: true, message: 'Please provide the value.' },
            {
              max: 4096,
              message: 'The maximum allowed length is 4096 characters.'
            }
          ]}
        >
          <TextArea rows={4} autoSize={{ minRows: 2, maxRows: 8 }} />
        </Form.Item>

        {!editFlow &&
          creationType === 'service' &&
          serviceName &&
          name &&
          environments.length > 0 && (
            <div style={previewStyle}>
              <div>
                <b>{`${environments.length} parameter(s)`}</b> will be created
                with the following name(s):
              </div>
              <div>
                {environments.map(env => (
                  <h4 key={env}>
                    /services/{env}/{serviceName}/{name}{' '}
                  </h4>
                ))}
              </div>
            </div>
          )}
        {!editFlow && creationType === 'generic' && name && (
          <div style={previewStyle}>
            <div>
              <b>1 parameter</b> will be created with the following name:
            </div>
            <h4>{name}</h4>
          </div>
        )}
        <Form.Item wrapperCol={{ span: 12, offset: 6 }}>
          <Button type="primary" htmlType="submit" loading={submitting}>
            {editFlow ? 'Save' : 'Create'}
          </Button>
        </Form.Item>
      </Form>
    </div>
  );
};

CreationForm.propTypes = {
  editFlow: PropTypes.bool.isRequired,
  initialFormData: PropTypes.shape(formDataShape)
};

export default CreationForm;
