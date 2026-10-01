import PropTypes from 'prop-types';
import React from 'react';
import { Provider } from 'react-redux';
import { App as AntApp, ConfigProvider } from 'antd';
import Home from './components/Home';
import { FeedbackBridge } from './feedback';

const theme = {
  token: { fontFamily: 'Arial, Helvetica, "Helvetica Neue", serif' }
};

const App = ({ store }) => (
  <Provider store={store}>
    <ConfigProvider theme={theme}>
      <AntApp>
        {/* Must render before Home, which shows notifications on mount. */}
        <FeedbackBridge />
        <Home />
      </AntApp>
    </ConfigProvider>
  </Provider>
);

App.propTypes = {
  store: PropTypes.object.isRequired
};

export default App;
