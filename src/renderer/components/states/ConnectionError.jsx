import React from 'react';
import PropTypes from 'prop-types';
import { Button, Result, Space, Typography } from 'antd';
import {
  ClockCircleOutlined,
  ExclamationCircleFilled,
  StopOutlined
} from '@ant-design/icons';
import { useDispatch, useSelector } from 'react-redux';
import {
  actions as parameterActions,
  selectors as parameterSelectors
} from '../../ducks/parameters';
import { selectors as settingsSelectors } from '../../ducks/settings';
import { actions as uiActions } from '../../ducks/ui';
import styles from './StateLayout.module.css';

const Code = props => <Typography.Text code {...props} />;

// Shown instead of the table when parameters could not be loaded.
// `kind` is 'expired', 'denied' or 'error' (anything else).
const ConnectionError = ({ kind }) => {
  const dispatch = useDispatch();
  const profile = useSelector(settingsSelectors.getProfile);
  const region = useSelector(settingsSelectors.getSsmRegion);
  const error = useSelector(parameterSelectors.getFetchError);
  const profileName = profile || 'default';

  let result;
  if (kind === 'expired') {
    const command = `aws sso login${profile ? ` --profile ${profile}` : ''}`;
    result = {
      status: 'warning',
      icon: <ClockCircleOutlined />,
      title: 'AWS session expired',
      subTitle: (
        <>
          The SSO session for profile <Code>{profileName}</Code> has expired.
          Sign in again from a terminal, then retry.
          <Typography.Paragraph
            code
            copyable
            className={styles.command}
            style={{ marginBottom: 0 }}
          >
            {command}
          </Typography.Paragraph>
        </>
      )
    };
  } else if (kind === 'denied') {
    result = {
      status: 'error',
      icon: <StopOutlined />,
      title: 'Access denied',
      subTitle: (
        <>
          Profile <Code>{profileName}</Code> isn&apos;t allowed to call{' '}
          <Code>ssm:DescribeParameters</Code> in <Code>{region}</Code>. Ask an
          admin for access, or switch to a profile that has it.
        </>
      )
    };
  } else {
    result = {
      status: 'error',
      icon: <ExclamationCircleFilled />,
      title: 'Parameters could not be loaded',
      subTitle: (error && error.message) || 'Check your AWS connection.'
    };
  }

  return (
    <div className={styles.center}>
      <Result
        className={styles.content}
        {...result}
        extra={
          <Space>
            <Button onClick={() => dispatch(uiActions.openSettings())}>
              Switch profile
            </Button>
            <Button
              type="primary"
              onClick={() => dispatch(parameterActions.fetchAllParameters())}
            >
              Retry
            </Button>
          </Space>
        }
      />
    </div>
  );
};

ConnectionError.propTypes = {
  kind: PropTypes.oneOf(['expired', 'denied', 'error']).isRequired
};

export default ConnectionError;
