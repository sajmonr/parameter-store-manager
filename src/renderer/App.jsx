import PropTypes from 'prop-types';
import React, { useEffect, useState } from 'react';
import { Provider } from 'react-redux';
import { App as AntApp, ConfigProvider, theme as antdTheme } from 'antd';
import Home from './components/Home';
import UpdateNotice from './components/UpdateNotice';
import { FeedbackBridge } from './feedback';

const fontFamily = 'Arial, Helvetica, "Helvetica Neue", serif';
const darkQuery = '(prefers-color-scheme: dark)';

// The main process sets nativeTheme.themeSource from the theme setting, and
// prefers-color-scheme follows it, so this covers both the OS and the setting.
const usePrefersDark = () => {
  const [dark, setDark] = useState(() => window.matchMedia(darkQuery).matches);
  useEffect(() => {
    const media = window.matchMedia(darkQuery);
    const onChange = e => setDark(e.matches);
    media.addEventListener('change', onChange);
    return () => media.removeEventListener('change', onChange);
  }, []);
  return dark;
};

const App = ({ store }) => {
  const dark = usePrefersDark();
  const theme = {
    algorithm: dark ? antdTheme.darkAlgorithm : antdTheme.defaultAlgorithm,
    token: { fontFamily }
  };

  return (
    <Provider store={store}>
      <ConfigProvider theme={theme}>
        <AntApp>
          {/* Must render before Home, which shows notifications on mount. */}
          <FeedbackBridge />
          <UpdateNotice />
          <Home />
        </AntApp>
      </ConfigProvider>
    </Provider>
  );
};

App.propTypes = {
  store: PropTypes.object.isRequired
};

export default App;
