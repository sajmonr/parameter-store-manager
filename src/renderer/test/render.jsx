import React from 'react';
import { Provider } from 'react-redux';
import { App as AntApp, ConfigProvider } from 'antd';
import { render } from '@testing-library/react';
import { FeedbackBridge } from '../feedback';
import { createTestStore } from './testStore';

// Renders `ui` with a store and antd's App, as App.jsx does.
export const renderWithStore = (ui, { store = createTestStore() } = {}) => ({
  store,
  ...render(
    <Provider store={store}>
      <ConfigProvider>
        <AntApp>
          <FeedbackBridge />
          {ui}
        </AntApp>
      </ConfigProvider>
    </Provider>
  )
});
