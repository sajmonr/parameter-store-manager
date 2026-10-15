import PropTypes from 'prop-types';
import React from 'react';
import { Provider } from 'react-redux';
import { App as AntApp, ConfigProvider, theme as antdTheme } from 'antd';
import AppShell from './components/AppShell';
import UpdateNotice from './components/UpdateNotice';
import { FeedbackBridge } from './feedback';
import useMediaQuery from './hooks/useMediaQuery';

const fontFamilyCode =
  'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace';

const App = ({ store }) => {
  // The main process sets nativeTheme.themeSource from the theme setting, and
  // prefers-color-scheme follows it, so this covers both the OS and the setting.
  const dark = useMediaQuery('(prefers-color-scheme: dark)');
  const theme = {
    algorithm: dark ? antdTheme.darkAlgorithm : antdTheme.defaultAlgorithm,
    token: { fontFamilyCode },
    // Exposes the tokens as --ant-* CSS variables for the CSS modules.
    cssVar: true
  };

  return (
    <Provider store={store}>
      <ConfigProvider theme={theme}>
        <AntApp notification={{ placement: 'topRight', duration: 4 }}>
          {/* Must render before AppShell, which shows notifications on mount. */}
          <FeedbackBridge />
          <UpdateNotice />
          <AppShell />
        </AntApp>
      </ConfigProvider>
    </Provider>
  );
};

App.propTypes = {
  store: PropTypes.object.isRequired
};

export default App;
